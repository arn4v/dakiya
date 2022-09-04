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

enum WaitMode {
  Stacked = "stacked",
  Indepedent = "independent",
}

export type SchedulerParams = {
  waitMode?: "stack" | "individual";
} & TransporterOrOptions &
  MongoClientOrUrl;

export type ExecParams = Pick<
  SendMailOptions,
  "cc" | "bcc" | "to" | "from" | "replyTo" | "subject"
>;

export interface SequenceMetadataDocument {
  _id: ObjectId | string;
  name: string;
  variables: Object;
  jobIds: ObjectId[];
  sendParams: ExecParams;
}

export interface ScheduledJobDocument {
  _id: ObjectId | string;
  sequenceId: ObjectId | string;
  key: string;
  scheduledFor: number;
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
