import { ObjectId } from "mongodb";
import { StringValue } from "ms";
import { TransportOptions, Transporter, SendMailOptions } from "nodemailer";
import { z } from "zod";
import { UnknownSequence } from "./sequence";

export type DakiyaParams = (
  | {
      transportOpts: TransportOptions;
    }
  | {
      transporter: Transporter;
    }
) & {
  mongoUri: string;
};

export type WorkflowParams = Pick<
  SendMailOptions,
  "cc" | "bcc" | "to" | "from" | "replyTo" | "subject"
>;

export interface SequenceMetadataDocument {
  _id: ObjectId | string;
  name: string;
  variables: Object;
  jobIds: ObjectId[];
  sendParams: WorkflowParams;
}

export interface ScheduledJobDocument {
  _id: ObjectId | string;
  workflowId: ObjectId | string;
  key: string;
  scheduledFor: number;
  createdAt: number;
}

export type InternalSequencesMap<Sequences extends UnknownSequence[]> = {
  [key in Sequences[number]["name"]]: UnknownSequence;
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
