import { MongoClient, ObjectId } from "mongodb";
import { StringValue } from "ms";
import { Transporter, SendMailOptions, createTransport } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";
import { UnknownSequence } from "./sequence";

type MongoClientOrUrl =
  | {
      mongo: MongoClient;
    }
  | {
      mongoUrl: string;
    };

type TransporterOrOptions =
  | {
      transporterOpts: SMTPTransport.Options;
    }
  | {
      transporter: Transporter;
    };

export type SchedulerParams = {
  waitMode?: "stack" | "individual";
  cronStringOverride?: string;
} & TransporterOrOptions &
  MongoClientOrUrl;

export type ExecParams = Pick<
  SendMailOptions,
  "cc" | "bcc" | "to" | "from" | "replyTo" | "subject"
>;

export interface SequenceMetadataDocument {
  _id: ObjectId;
  name: string;
  variables: Object;
  jobs: ObjectId[];
  completedJobs: ObjectId[];
  sendParams: ExecParams;
}

export interface ScheduledJobDocument {
  _id: ObjectId;
  sequenceId: ObjectId;
  key: string;
  scheduledFor: number;
  canceled: boolean;
  sentAt: number | null;
  createdAt: number;
}

export type InternalSequencesMap<
  Sequences extends Readonly<UnknownSequence[]>
> = {
  [key in Sequences[number]["key"]]: Sequences extends Array<infer U>
    ? U
    : UnknownSequence;
};

export enum SequenceActionType {
  WAIT_FOR = "waitFor",
  SEND_MAIL = "sendMail",
}

export type SequenceAction =
  | {
      type: SequenceActionType.WAIT_FOR;
      value: StringValue;
    }
  | {
      type: SequenceActionType.SEND_MAIL;
      value: string;
    };

export type EmailSubjectOrHtmlGenerator<
  VariablesSchema extends z.ZodObject<{}>
> = (vars: z.infer<VariablesSchema>) => string;
