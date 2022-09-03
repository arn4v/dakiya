# Dakiya

Simple email sequence scheduler for Node.js.

## Usage

```typescript
import { Sequence, Scheduler } from "dakiya";
import { z } from "zod";

const welcomeVariablesSchema = z.object({
  name: z.string(),
  verificationUrl: z.string(),
});

enum EmailSequence {
  Onboarding = "onboarding",
}

export const onboarding = new Sequence(
  EmailSequence.Onboarding,
  welcomeVariablesSchema
)
  .waitFor("5m")
  .mail({
    key: "welcome",
    getSubject() {
      return "Welcome to {Product Name}!";
    },
    getHtml({ name }) {
      return `Hi ${name}, Welcome to {Product Name}`; // Email HTML
    },
  })
  .mail({
    key: "verify_email",
    getSubject() {
      return "Verify Your Email";
    },
    getHtml({ verificationUrl }) {
      return "";
    },
  });

export const scheduler = new Scheduler([onboarding], {
  mongoUri: "", // mongodb connections string
  transportOpts: {}, // nodemailer transport options
});

await scheduler.initialize();
await scheduler.exec(
  EmailSequence.Onboarding,
  { name: "", verificationUrl: "" },
  // Nodemailer SendMailOptions
  {
    to: "",
    from: "",
  }
);
```
