# Dakiya

![CI](https://github.com/arn4v/dakiya/actions/workflows/ci.yml/badge.svg)

_Simple_ email automation for Node.js _made easy_.

## Features

- **Zero config management**: Use simple, chainable code to create email sequences.
- **Email platform agnostic**: Only SMTP credentials required.

## Roadmap


1. [ ] Compliance Features (Unsubscribing)
2. [ ] Custom conditionals support
3. [ ] Tracking Opens
4. [ ] Self-hostable web interface

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
    subject: "Welcome to {Product Name}!",
    html({ name }) {
      return `Hi ${name}, Welcome to {Product Name}`; // Email HTML
    },
  })
  .sendMail({
    subject: "Verify Your Email",
    html({ verificationUrl }) {
      return "";
    },
  })
  .waitFor("1d")
  .sendMail({
    subject: "Access {Product Name} On The Go!",
    html({ name }) {
      const downloadUrl = "";
      return `Hi ${name}, Access {Product Name} on the go using our mobile app. Download for iOS: ${downloadUrl}`
    }
  });

export const scheduler = new Scheduler([onboarding], {
  mongoUri: "", // mongodb connections string
  transportOpts: {}, // nodemailer transport options
  waitMode: "stack"
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
