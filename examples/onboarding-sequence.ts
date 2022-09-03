import { Scheduler, Sequence } from "../src";
import { z } from "zod";

const onboardingSequenceVarsSchema = z.object({
  name: z.string(),
  verificationUrl: z.string(),
});

const onboardingSequence = new Sequence(
  "onboarding",
  onboardingSequenceVarsSchema
)
  .waitFor("5m")
  .sendMail({
    key: "Welcome",
    subject({ name }) {
      // Return subject string
      return `Welcome to App, ${name}`;
    },
    html({ name, verificationUrl }) {
      // Return Email HTML
      return "";
    },
  });
// .waitFor("1d")
// .mail(/** */);

const scheduler = new Scheduler([onboardingSequence], {
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

  await scheduler.start(
    "onboarding",
    {
      name,
      verificationUrl: url,
    },
    { to: email, from: "support@myapp.com" }
  );
};

const run = async () => {
  await scheduler.initialize();

  await createUser({
    email: "email@email.com",
    name: "Arnav",
    password: "securepassword123",
  });
};

void run();
