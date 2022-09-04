import {
  AnyBulkWriteOperation,
  Collection,
  Db,
  MongoClient,
  ObjectId,
} from "mongodb";
import ms from "ms";
import * as cron from "node-cron";
import { createTransport, Transporter } from "nodemailer";
import { z, ZodError } from "zod";
import { UnknownSequence } from "./sequence";
import {
  SequenceActionType,
  SchedulerParams as SchedulerParams,
  InternalSequencesMap,
  ScheduledJobDocument,
  SequenceMetadataDocument,
  ExecParams,
  SequenceAction,
} from "./types";

export class Scheduler<
  Sequences extends Readonly<UnknownSequence[]>,
  SequenceMap extends InternalSequencesMap<Sequences> = InternalSequencesMap<Sequences>,
  SequenceKeys extends keyof SequenceMap = keyof SequenceMap
> {
  private sequences: Readonly<SequenceMap>;
  mongo: MongoClient;
  db: Db | undefined;
  sequenceCollection: Collection<SequenceMetadataDocument> | undefined;
  jobsCollection: Collection<ScheduledJobDocument> | undefined;
  transporter: Transporter;
  initialized: boolean = false;

  constructor(_sequences: Sequences, private params: SchedulerParams) {
    this.transporter =
      "transporter" in params
        ? params.transporter
        : createTransport(params.transporterOpts);

    this.sequences = _sequences.reduce((map, sequence) => {
      const key = sequence.key as unknown as SequenceKeys;
      map[key] = sequence as SequenceMap[SequenceKeys];
      return map;
    }, {} as SequenceMap) as Readonly<SequenceMap>;

    this.mongo =
      "mongo" in params ? params.mongo : new MongoClient(params.mongoUrl);

    this.sendPendingEmails = this.sendPendingEmails.bind(this);

    if (!params.waitMode) params.waitMode = "stack";
  }

  async initialize() {
    try {
      await this.mongo.connect();

      this.db = this.mongo.db("dakiya");
      this.sequenceCollection = this.db.collection("sequences");
      this.jobsCollection = this.db.collection("jobs");

      console.log("Dakiya: Connected to MongoDB");
    } catch (err) {
      console.error("Dakiya: Unable to connect to MongoDB");
      throw err;
    }

    this.startCron();
    console.log("Dakiya: Cronjob started");
  }

  private startCron() {
    cron.schedule("* * * * *", (now) => {
      void this.sendPendingEmails();
    });
  }

  async getScheduledSequence(_id: ObjectId | string) {
    const sequence = await this.sequenceCollection?.findOne({
      _id,
    });

    if (!sequence) {
      throw "Sequence not found";
    }

    return sequence;
  }

  async getScheduledJobs() {
    return await this.jobsCollection
      ?.find({
        scheduledFor: {
          $lte: new Date().getTime(),
        },
      })
      .toArray();
  }

  async sendPendingEmails() {
    const jobs = (await this.getScheduledJobs()) || [];
    for (const { _id, key, sequenceId: workflowId } of jobs) {
      try {
        const scheduledSequence = await this.getScheduledSequence(workflowId);

        if (!scheduledSequence) {
          console.error(
            `sendPendingEmails: Invalid scheduled sequence id ${workflowId}. Not sending email ${key} ${_id}.`
          );
          continue;
        }

        const sequenceObject =
          this.sequences[scheduledSequence.name as unknown as SequenceKeys];
        const template = sequenceObject.emails[key];
        const variables = scheduledSequence?.variables as z.infer<
          typeof sequenceObject["variableSchema"]
        >;

        await this.transporter.sendMail({
          subject:
            typeof template.subject == "function"
              ? template.subject(variables)
              : template.subject,
          html:
            typeof template.html == "function"
              ? template.html(variables)
              : template.html,
        });
        await this.jobsCollection?.deleteOne({
          _id,
        });
      } catch (e) {
        if (e instanceof Error) {
          console.error(
            `sendPendingEmails: Failed to send email ${key} of workflow id ${workflowId}. Reason: ${e.message}`
          );
        }
        continue;
      }
    }
  }

  async cancel(_id: ObjectId | string) {
    const sequence = await this.getScheduledSequence(_id);

    await this.jobsCollection?.deleteMany({
      _id: {
        $in: sequence?.jobIds,
      },
    });

    await this.sequenceCollection?.deleteOne({
      _id,
    });
  }

  async schedule<Name extends SequenceKeys>(
    name: Name,
    variables: z.infer<SequenceMap[Name]["variableSchema"]>,
    sendParams: ExecParams
  ) {
    const sequence = this.sequences[name];

    if (!sequence) throw new Error("Sequence not found.");

    try {
      sequence.variableSchema?.parse(variables);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error(
          `Variables provided for sequence ${String(
            name
          )} do not match schema.`,
          e.issues
        );
        throw e;
      }
    }

    const { jobIds, ops, scheduledSequenceId } =
      this.getScheduledJobsOpsObject(sequence);

    await this.sequenceCollection?.insertOne({
      _id: scheduledSequenceId,
      name: sequence.key,
      variables,
      jobIds,
      sendParams: sendParams,
    });
    await this.jobsCollection?.bulkWrite(ops);

    return scheduledSequenceId;
  }

  getScheduledJobsOpsObject<Sequence extends UnknownSequence>(
    sequence: Sequence
  ) {
    let waitFor: number = 0;

    const ops: AnyBulkWriteOperation<ScheduledJobDocument>[] = [];

    const jobIds: ObjectId[] = [];

    const scheduledSequenceId = new ObjectId().toHexString();

    const startTime = new Date().getTime();

    for (const action of sequence.steps) {
      if (action.type == SequenceActionType.WAIT_FOR) {
        if (this.params.waitMode == "individual") {
          waitFor = ms(action.value);
        } else {
          waitFor = waitFor + ms(action.value);
        }
      } else if (action.type == SequenceActionType.SEND_MAIL) {
        const jobId = new ObjectId();

        jobIds.push(jobId);

        ops.push({
          insertOne: {
            document: {
              _id: jobId,
              key: sequence.emails[action.value].key,
              sequenceId: scheduledSequenceId,
              scheduledFor: startTime + waitFor,
              createdAt: new Date().getTime(),
            },
          },
        });

        if (this.params.waitMode == "individual") {
          waitFor = 0;
        }
      }
    }

    return {
      ops,
      jobIds,
      scheduledSequenceId,
      startTime,
    };
  }
}
