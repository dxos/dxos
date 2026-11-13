---
branch: HEAD
commit: bedcaa039d6544a45336d29b12bb68fc5cbae225
base: 2f78880b0c3d69d8f1de2732e0c497579a45c018
mode: fast
createdAt: 2026-11-10T21:00:26.999Z
isFinalized: true
groups: 76
rules: [declare-optional-services-with-noop-layers, no-try-catch-in-effect-code, test-real-scenario-not-narrower-proxy]
reviewId: bedcaa039d
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bedcaa039d-1 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:72
- bedcaa039d-2 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:106
- bedcaa039d-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:287

## Issues

# WARN bedcaa039d-1 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:72`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 72-83 (`AssistantTestLayer({`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bedcaa039d-2 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:106`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 106-117 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bedcaa039d-3 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:287`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.93. The likeliest place is lines 287-299 (`const operationBehind = (tool: Tool.Any): Operation.Definition.Any | undefine...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2f78880b0c3d69d8f1de2732e0c497579a45c018`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 118 uncertain, 74 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 117 (77 verdicts re-asked with context the model requested)
estimated input tokens: 973229
billed input tokens: 902010 (cost $0.0379)
measured chars per token: 3.24
```
