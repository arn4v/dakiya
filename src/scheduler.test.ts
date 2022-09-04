import { describe, it } from "@jest/globals";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import ms from "ms";
import cron from "node-cron";
import {
  createTestAccount,
  createTransport,
  TestAccount,
  Transporter,
} from "nodemailer";
import { z, ZodError } from "zod";
import { Scheduler } from "./scheduler";
import { Sequence } from "./sequence";

const testSequence = new Sequence(
  "test",
  z.object({
    name: z.string(),
  })
)
  .sendMail({
    html: "1",
    subject: "",
  })
  .sendMail({
    html: "2",
    subject: "",
  });

describe("Scheduler", () => {
  let mongod: MongoMemoryServer;
  let mongo: MongoClient;
  let transporter: Transporter;
  let testAccount: TestAccount;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({
      binary: {
        checkMD5: false,
        arch: "x86_64",
      },
      instance: {},
    });

    mongo = await MongoClient.connect(mongod.getUri());

    testAccount = await createTestAccount();

    transporter = createTransport({
      ...testAccount.smtp,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  });

  afterAll(() => mongod.stop());

  beforeEach(async () => {
    const db = mongo.db("dakiya");

    for (const collection of await db.listCollections().toArray()) {
      await db.collection(collection.name).drop();
    }
  });

  it("Should connect to MongoDB on initialize", async () => {
    const cronSpy = jest.spyOn(cron, "schedule");
    const mongoSpy = jest.spyOn(mongo, "connect");

    const scheduler = new Scheduler([testSequence], {
      mongo,
      transporter,
    });

    await scheduler.initialize();

    expect(mongoSpy).toBeCalled();
    expect(cronSpy).toBeCalled();
  });

  it("Should throw an exception if variables don't match zod spec", async () => {
    const scheduler = new Scheduler([testSequence], {
      mongo,
      transporter,
    });

    await scheduler.initialize();

    // @ts-ignore
    expect(() => scheduler.schedule("test", {})).rejects.toBeInstanceOf(
      ZodError
    );
  });

  it("scheduler.schedule() adds jobs to scheduled jobs collection", async () => {
    const scheduler = new Scheduler([testSequence], {
      mongo,
      transporter,
    });

    await scheduler.initialize();

    await scheduler.schedule(
      "test",
      {
        name: "Test",
      },
      {
        to: "test@test.com",
        from: "me@me.com",
        subject: "Test ",
      }
    );

    expect(await scheduler.getScheduledJobs()).toHaveLength(2);
    expect(await scheduler.sequenceCollection?.find().toArray()).toHaveLength(
      1
    );
  });

  it("Should cancel all jobs in a sequence", async () => {
    const scheduler = new Scheduler([testSequence], {
      mongo,
      transporter,
    });

    await scheduler.initialize();

    const scheduledSequenceId = await scheduler.schedule(
      "test",
      {
        name: "Test",
      },
      {
        to: "test@test.com",
        from: "me@me.com",
        subject: "Test ",
      }
    );

    expect(await scheduler.getScheduledJobs()).toHaveLength(2);

    await scheduler.cancel(scheduledSequenceId);

    expect(await scheduler.getScheduledJobs()).toHaveLength(0);
  });

  it("Should stack waitFor delays", async () => {
    const sequence = new Sequence(
      "test",
      z.object({
        name: z.string(),
      })
    )
      .waitFor("1m")
      .sendMail({
        html: "1",
        subject: "",
      })
      .waitFor("2m")
      .sendMail({
        html: "2",
        subject: "",
      });

    const scheduler = new Scheduler([sequence], {
      mongo,
      transporter,
      waitMode: "stack",
    });

    const { ops } = scheduler.getScheduledJobsOpsObject(sequence);

    // @ts-ignore
    const jobs = ops.map((item) => item.insertOne.document);

    expect(ops).toHaveLength(2);

    expect(jobs?.[1].scheduledFor! - jobs?.[0].scheduledFor!).toBe(ms("2m"));
  });

  it("Should not stack (individual mode) waitFor delays", async () => {
    const sequence = new Sequence(
      "test",
      z.object({
        name: z.string(),
      })
    )
      .waitFor("1m")
      .sendMail({
        html: "1",
        subject: "",
      })
      .waitFor("2m")
      .sendMail({
        html: "2",
        subject: "",
      });

    const scheduler = new Scheduler([sequence], {
      mongo,
      transporter,
    });

    const { ops } = scheduler.getScheduledJobsOpsObject(sequence);

    // @ts-ignore
    const jobs = ops.map((item) => item.insertOne.document);

    expect(ops).toHaveLength(2);

    expect(jobs?.[1].scheduledFor! - jobs?.[0].scheduledFor!).toBe(ms("1m"));
  });
});
