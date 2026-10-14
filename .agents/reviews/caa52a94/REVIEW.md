---
branch: dm/awesome-bohr-vwkzh8
commit: caa52a9404f5935c3d7a875c18aeac659a6ff151
base: 346175bc41758ed985f7d79bec49739f9006a9e1
mode: fast
createdAt: 2026-10-02T05:44:23.259Z
isFinalized: true
groups: 59
rules: [declare-optional-services-with-noop-layers, errors-extend-base-error, no-casts]
reviewId: caa52a94
---

_3 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- caa52a94-1 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:28
- caa52a94-2 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:81
- caa52a94-3 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- caa52a94-4 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:373

## Issues

# ERROR caa52a94-1 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:28`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.88. The likeliest place is lines 28-39 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR caa52a94-2 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 81-92 (`add: (obj: Obj.Unknown) => run(Database.add(obj)),`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN caa52a94-3 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). Judged with added `importers, package` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR caa52a94-4 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:373`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 373-384 (`AiParser.parseResponse({`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `346175bc41758ed985f7d79bec49739f9006a9e1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 106 uncertain, 89 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 129 (61 verdicts re-asked with context the model requested)
estimated input tokens: 1030660
billed input tokens: 980598 (cost $0.0412)
measured chars per token: 3.15
```
