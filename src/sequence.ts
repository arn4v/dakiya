import { StringValue } from "ms";
import { z } from "zod";
import {
  SequenceAction,
  SequenceActionType,
  EmailSubjectOrHtmlGenerator,
} from "./types";

export class Sequence<
  Key extends string,
  VariablesSchema extends z.ZodObject<{}>
> {
  public emails: Record<
    string,
    {
      key: string;
      getSubject: EmailSubjectOrHtmlGenerator<VariablesSchema>;
      getHtml: EmailSubjectOrHtmlGenerator<VariablesSchema>;
    }
  > = {};
  public steps: SequenceAction[] = [];

  constructor(public key: Key, public variableSchema: VariablesSchema) {}

  waitFor(value: StringValue) {
    const action: SequenceAction = { type: SequenceActionType.WAIT_FOR, value };

    this.steps.push(action);

    return this;
  }

  mail({
    key,
    getSubject,
    getHtml,
  }: {
    key: string;
    getSubject: EmailSubjectOrHtmlGenerator<VariablesSchema>;
    getHtml: EmailSubjectOrHtmlGenerator<VariablesSchema>;
  }) {
    const action: SequenceAction = {
      type: SequenceActionType.SEND_MAIL,
      value: key,
    };

    this.emails[key] = {
      key: key,
      getHtml,
      getSubject,
    };
    this.steps.push(action);

    return this;
  }
}

export const createSequence = <
  Variables extends z.ZodObject<{}>,
  Name extends string
>(
  name: Name,
  variables: Variables
) => new Sequence(name, variables);

export type UnknownSequence = Sequence<any, any>;
