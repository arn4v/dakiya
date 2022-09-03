# Dakiya

Code-first email workflow & scheduling tool for Node.js.

## Usage

```typescript
import { Dakiya, createSequence } from "../src";
import { z } from "zod";

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

const dakiya = new Dakiya([welcomeSequence], {
  mongoUri: process.env.MONGODB_URI!,
  transportOpts: {},
});

const run = async () => {
  await dakiya.initialize();

  await dakiya.scheduleSequence(
    "onboarding",
    {
      name: "Arnav,
      verificationUrl: "https://myapp.com/verify?token=12345",
    },
    { to: 'arnav@arnavgosain.com', from: "support@myapp.com" }
  );
}
};

run();
```
