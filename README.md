# Dakiya ![](https://github.com/arn4v/dakiya/actions/workflows/ci/badge.svg)

_Simple_ email automation for Node.js _made easy_.

## Features

- **Zero config management**: Use simple, chainable code to create email sequences.
- **Email platform agnostic**: Works with any email platform, you just need SMTP credentials.

## Example Ussage

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
  .sendMail({
    key: "welcome",
    subject: "Welcome to {Product Name}!",
    html({ name }) {
      return `Hi ${name}, Welcome to {Product Name}`; // Email HTML
    },
  })
  .waitFor("5m")
  .sendMail({
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
await scheduler.schedule(
  EmailSequence.Onboarding,
  { name: "", verificationUrl: "" },
  // Nodemailer SendMailOptions
  {
    to: "",
    from: "",
  }
);
```
