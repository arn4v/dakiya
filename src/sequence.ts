import ms from "ms";

enum ActionType {
  WAIT_FOR = "waitFor",
  SEND_MAIL = "sendMail",
}

interface SendMailParams {
  id: string;
  template: string;
}

type Action =
  | {
      type: ActionType.WAIT_FOR;
      value: string;
    }
  | {
      type: ActionType.SEND_MAIL;
      value: SendMailParams;
    };

export class Sequence<Actions = []> {
  actions: Readonly<Actions>;

  constructor(actions?: Actions) {
    this.actions = (actions ?? []) as Actions;
  }

  waitFor(value: string) {
    const action: Action = { type: ActionType.WAIT_FOR, value };

    return this as unknown as Sequence<[...Actions, typeof action]>;
  }

  mail<Id extends string, Template extends string>(params: {
    id: Id;
    template: Template;
  }) {
    const action: Action = {
      type: ActionType.SEND_MAIL,
      value: params,
    };

    return this as unknown as Sequence<[...Actions, typeof action]>;
  }
}

export const createSequence = () => new Sequence();

const sequence = createSequence().waitFor("5m").mail({
  id: "",
  template: "",
});

export type UnknownSequence = Sequence<any>;
