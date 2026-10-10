---
branch: dm/dreamy-cray-rsm12m
commit: 78e13bfc9fd948dce32608cda82f24e2ddfc97f9
base: db72c48513fd5533ed7a28aaf33893c164b0a057
mode: fast
createdAt: 2026-10-07T17:53:11.110Z
isFinalized: true
groups: 56
rules: [errors-extend-base-error, jsdoc-non-obvious-identifiers, no-casts, no-sleep-in-test]
reviewId: 78e13bfc9f
---

_2 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 78e13bfc9f-1 - resolved - no-sleep-in-test - packages/core/mesh/edge-client/src/edge-client.test.ts:93
- 78e13bfc9f-2 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:823
- 78e13bfc9f-3 - ignored - jsdoc-non-obvious-identifiers - packages/core/protocols/src/edge/edge.ts:198
- 78e13bfc9f-4 - ignored - no-casts - packages/core/protocols/src/edge/edge.ts:510

## Issues

# WARN 78e13bfc9f-1 no-sleep-in-test `packages/core/mesh/edge-client/src/edge-client.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 93-104 (`setTimeout(() => admitConnection.wake(), 20);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 78e13bfc9f-2 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:823`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 823-848 (`export class SegmentedMessageLimitError extends Error {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 78e13bfc9f-3 jsdoc-non-obvious-identifiers `packages/core/protocols/src/edge/edge.ts:198`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 198-212 (`export type JoinSpaceRequest = {`, location confidence 0.12). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 78e13bfc9f-4 no-casts `packages/core/protocols/src/edge/edge.ts:510`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 510-521 (`data: Record<SpaceId, { diagnostics?: any & { redFlags: string[] }; fetchErro...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `db72c48513fd5533ed7a28aaf33893c164b0a057`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 160 uncertain, 106 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 184 (96 verdicts re-asked with context the model requested)
estimated input tokens: 2677175
billed input tokens: 2655924 (cost $0.1115)
measured chars per token: 3.02
```
