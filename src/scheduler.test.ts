import { describe, it } from "@jest/globals";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import cron from "node-cron";
import {
  createTestAccount,
  createTransport,
  TestAccount,
  Transporter
} from "nodemailer";
import { z, ZodError } from "zod";
import { Scheduler } from "./scheduler";
import { Sequence } from "./sequence";

const testSequence = new Sequence(
  "test",
  z.object({
    name: z.string(),
  })
).sendMail({
  html: "Test",
  subject: "Test",
});

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

describe("Scheduler", () => {
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

    const collectionSpy = jest.spyOn(scheduler.jobsCollection!, "find");

    const scheduled = await scheduler.getScheduledJobs();

    expect(collectionSpy).toBeCalled();
    expect(scheduled).toHaveLength(1);
  });
});
