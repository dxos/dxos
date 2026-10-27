---
branch: HEAD
commit: 714699f7e055766cb65d08213634d54d0c90ba12
base: 791362a9a364ab55650f1f707ec67621cf0ded08
mode: fast
createdAt: 2026-10-05T10:06:59.187Z
isFinalized: true
groups: 53
rules: [bounded-live-state, no-mixed-promise-effect-lifecycle]
reviewId: 714699f7
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 714699f7-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:167
- 714699f7-2 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/process-store.ts:139

## Issues

# WARN 714699f7-1 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:167`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 167-178 (`public async appendTurnMessage(message: Message.Message): Promise<void> {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 714699f7-2 bounded-live-state `packages/core/compute/compute-runtime/src/process-store.ts:139`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.84. The likeliest place is lines 139-150 (`putProcess(record: PersistedProcess): Effect.Effect<void> {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `791362a9a364ab55650f1f707ec67621cf0ded08`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 123 uncertain, 130 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 157 (75 verdicts re-asked with context the model requested)
estimated input tokens: 1180764
billed input tokens: 1121410 (cost $0.0471)
measured chars per token: 3.16
```
