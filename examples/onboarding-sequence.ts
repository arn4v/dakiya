// @ts-nocheck
import { Scheduler, createSequence } from "../src";
import { z } from "zod";

const html = String.raw;

const onboardingSequenceVarsSchema = z.object({
  name: z.string(),
  verificationUrl: z.string(),
});

const welcomeSequence = createSequence(
  "onboarding",
  onboardingSequenceVarsSchema
)
  .waitFor("5m")
  .mail({
    key: "Welcome",
    getSubject({ name }) {
      // Return subject string
      return `Welcome to App, ${name}`;
    },
    getHtml({ name, verificationUrl }) {
      // Return Email HTML
      return "";
    },
  })
  .waitFor("1d")
  .mail(/** */);

const dakiya = new Scheduler([welcomeSequence], {
  mongoUri: process.env.MONGODB_URI!,
  transportOpts: {},
});

const getVerificationUrl = (token: string) =>
  `https://myapp.com/verify?token=${token}`;

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

const createUser = async ({ name, email }: CreateUserDto) => {
  //> Save to db
  // const user = await usersCollection.insertOne(/* ... */);
  // const token = createVerificationToken({});
  const url = getVerificationUrl("myToken");

  //> Create verification link

  await dakiya.exec(
    "onboarding",
    {
      name,
      verificationUrl: url,
    },
    { to: email, from: "support@myapp.com" }
  );
};

const run = async () => {
  await dakiya.initialize();

  await createUser({
    email: "email@email.com",
    name: "Arnav",
    password: "securepassword123",
  });
};

void run();
