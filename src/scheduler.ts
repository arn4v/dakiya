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
import { z } from "zod";
import { UnknownSequence } from "./sequence";
import {
  SequenceActionType,
  SchedulerParams as SchedulerParams,
  InternalSequencesMap,
  ScheduledJobDocument,
  SequenceMetadataDocument,
  ExecParams,
} from "./types";

export class Scheduler<
  Sequences extends Readonly<UnknownSequence[]>,
  SequenceMap extends InternalSequencesMap<Sequences> = InternalSequencesMap<Sequences>,
  SequenceKeys extends keyof SequenceMap = keyof SequenceMap
> {
  private sequences: Readonly<SequenceMap>;
  private mongo: MongoClient;
  private db: Db;
  private sequenceCollection: Collection<SequenceMetadataDocument>;
  private jobsCollection: Collection<ScheduledJobDocument>;
  private mailTransporter: Transporter;

  constructor(_sequences: Sequences, params: SchedulerParams) {
    if ("transporter" in params) {
      this.mailTransporter = params.transporter;
    } else {
      this.mailTransporter = createTransport(params.transportOpts);
    }

    this.sequences = _sequences.reduce((map, sequence) => {
      const key = sequence.key as unknown as SequenceKeys;
      map[key] = sequence as SequenceMap[SequenceKeys];
      return map;
    }, {} as SequenceMap) as Readonly<SequenceMap>;

    this.mongo = new MongoClient(params.mongoUri, {});
    this.db = this.mongo.db("dakiya");
    this.sequenceCollection = this.db.collection("sequences");
    this.jobsCollection = this.db.collection("jobs");
    this.sendPendingEmails = this.sendPendingEmails.bind(this);
  }

  async initialize() {
    await this.connectToDb();
    this.startCron();
  }

  private startCron() {
    cron.schedule("* * * * *", (now) => {
      void this.sendPendingEmails();
    });
  }

  private async getScheduledSequence(_id: ObjectId | string) {
    return await this.sequenceCollection.findOne({
      _id,
    });
  }

  private async getScheduledJobs() {
    return await this.jobsCollection
      .find({
        scheduledFor: {
          $lte: new Date().getTime(),
        },
      })
      .toArray();
  }

  private async sendPendingEmails() {
    const jobs = await this.getScheduledJobs();
    for (const { _id, key, workflowId } of jobs) {
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

        await this.mailTransporter.sendMail({
          subject: template.getSubject(variables),
          html: template.getHtml(variables),
        });
        await this.jobsCollection.deleteOne({
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

  async exec<Name extends SequenceKeys>(
    name: Name,
    variables: z.infer<SequenceMap[Name]["variableSchema"]>,
    sendParams: ExecParams
  ) {
    const sequence = this.sequences[name];

    if (!sequence) throw new Error("Sequence not found.");

    const ops: AnyBulkWriteOperation<ScheduledJobDocument>[] = [];
    const jobIds: ObjectId[] = [];
    let waitFor: number = 0;

    const workflowId = new ObjectId().toHexString();

    for (const action of sequence.steps) {
      if (action.type == SequenceActionType.WAIT_FOR) {
        waitFor = ms(action.value);
      } else if (action.type == SequenceActionType.SEND_MAIL) {
        const jobId = new ObjectId();

        jobIds.push(jobId);

        ops.push({
          insertOne: {
            document: {
              _id: jobId,
              key: sequence.emails[action.value].key,
              workflowId,
              scheduledFor: new Date().getTime() + waitFor,
              createdAt: new Date().getTime(),
            },
          },
        });
        waitFor = 0;
      }
    }

    await this.sequenceCollection.insertOne({
      _id: new ObjectId(),
      name: sequence.key,
      variables,
      jobIds,
      sendParams: sendParams,
    });
    await this.jobsCollection.bulkWrite(ops);
  }

  private async connectToDb() {
    await this.mongo.connect();
  }
}
