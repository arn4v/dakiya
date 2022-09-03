import { z } from "zod";

export enum ActionType {
  WAIT_FOR = "waitFor",
  SEND_MAIL = "sendMail",
}

type Action =
  | {
      type: ActionType.WAIT_FOR;
      value: string;
    }
  | {
      type: ActionType.SEND_MAIL;
      value: string;
    };

type EmailSubjectOrHtmlGenerator<VariablesSchema extends z.ZodObject<{}>> = (
  vars: z.infer<VariablesSchema>
) => string;
export class Sequence<
  Name extends string,
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
  public steps: Action[] = [];

  constructor(public name: Name, public variableSchema: VariablesSchema) {}

  waitFor(value: string) {
    const action: Action = { type: ActionType.WAIT_FOR, value };

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
    const action: Action = {
      type: ActionType.SEND_MAIL,
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
