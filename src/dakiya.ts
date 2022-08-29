import Redis, { RedisOptions } from "ioredis";
import cron from "node-cron";
import { createTransport, Transporter, TransportOptions } from "nodemailer";
import { Sequence, UnknownSequence } from "./sequence";

export type DakiyaParams<Sequences extends UnknownSequence[]> = {
  sequences: Sequences;
  // Adds tracking pixels
  trackUserActions?: boolean;
} & (
  | {
      transportOpts: TransportOptions;
    }
  | {
      transporter: Transporter;
    }
) &
  (
    | {
        redisOpts: Pick<
          RedisOptions,
          "port" | "host" | "username" | "password" | "db"
        >;
      }
    | {
        redis: Redis;
      }
  );

export class Dakiya<Sequences extends UnknownSequence[]> {
  private redis: Redis;
  private mailTransporter: Transporter;

  constructor(private params: DakiyaParams<Sequences>) {
    if ("transporter" in params) {
      this.mailTransporter = params.transporter;
    } else {
      this.mailTransporter = createTransport(params.transportOpts);
    }

    if ("redisOpts" in params) {
      this.redis = new Redis({
        ...params.redisOpts,
        lazyConnect: true,
      });
    } else {
      this.redis = params.redis;
    }
  }

  async start() {
    await this.connectToRedis();
    this.startCron();
  }

  startCron() {
    cron.schedule("* * * * *", (now) => {
      void (async () => {})();
    });
  }

  async startSequence(to: string) {}

  // Send all emails immediately – only for testing/debugging purposes
  async UNSAFE__sendSequenceImmediate() {}

  async addUser(email: string) {}

  async unsubscribeUser() {}

  private async connectToRedis() {
    await this.redis.connect();
  }
}
