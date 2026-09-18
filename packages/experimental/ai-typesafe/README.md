# @dxos/ai-typesafe

Experimental Effect client for [TypeSafe](https://docs.typesafe.ai/introduction)'s System One model
(`jev`), which answers typed *questions* about a *state* rather than generating text.

`DecisionModel` is the service — same shape as `LanguageModel` in `effect/unstable/ai`: a provider
adapts its own `evaluate`, and callers depend on the tag. A schema is both the request and the
response contract: each field of the struct compiles to one question, all of them ride a single
call, and the answers decode back into the type the caller declared.

## Primitives

| Field declaration                | Question | Result                         |
| -------------------------------- | -------- | ------------------------------ |
| `DecisionModel.Noul`             | `noul`   | truth value in `[0, 1]`        |
| `Schema.Boolean`                 | `noul`   | `boolean` (thresholded at 0.5) |
| `DecisionModel.Choice(...)`      | `choice` | `{ _tag, confidence }`         |
| `Schema.Literals([...])`         | `choice` | the literal; confidence dropped |
| `DecisionModel.Score(...)`       | `score`  | `{ score, confidence }`        |

Every field needs a `description` — those are the instructions the question is asked with.

```ts
const decisions = DecisionModel.generate({
  context: ticket,
  schema: Schema.Struct({
    urgent: DecisionModel.Noul.annotate({ description: 'Does this convey urgency?' }),
    team: DecisionModel.Choice({
      billing: 'Payments, invoicing, refunds',
      technical: 'Bugs, outages, integrations',
    }).annotate({ description: 'Which team should handle this?' }),
    frustration: DecisionModel.Score('Calm', 'Frustrated', 'Very angry').annotate({
      description: 'How frustrated is the customer?',
    }),
  }),
}).pipe(Effect.provide(TypeSafeClient.layer({ apiKey: Redacted.make(process.env.TYPESAFE_API_KEY!) })));
```

## Tests

`src/DecisionModel.test.ts` asks the real System One endpoint — a routing/urgency/frustration ticket
answered through every primitive. Those tests are tagged `manual` because CI has no key:

```bash
DX_RUN_MANUAL_TESTS=1 TYPESAFE_API_KEY=... moon run ai-typesafe:test
```

The two suites that need no key run everywhere: schema compilation (a field that cannot be asked is
rejected before any request) and the `EvaluateResponse` wire contract (decoded against the payload
shapes the endpoint produces).
