---
branch: dm/dreamy-cray-rsm12m
commit: c9aee016388fc6f6390752c0abe8402a43640b47
base: d1c6d6934f1353865b3fe25531f0f260aee2082c
mode: fast
createdAt: 2026-10-07T15:18:55.336Z
isFinalized: true
groups: 52
rules: [errors-extend-base-error, jsdoc-non-obvious-identifiers, no-casts]
reviewId: c9aee0163
---

_4 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c9aee0163-1 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-client.ts:83
- c9aee0163-2 - resolved - no-casts - packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts:884
- c9aee0163-3 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:823
- c9aee0163-4 - ignored - jsdoc-non-obvious-identifiers - packages/core/protocols/src/edge/edge.ts:198
- c9aee0163-5 - ignored - no-casts - packages/core/protocols/src/edge/edge.ts:510

## Issues

# ERROR c9aee0163-1 no-casts `packages/core/mesh/edge-client/src/edge-client.ts:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 83-94 (`export interface EdgeConnection extends Required<Lifecycle> {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c9aee0163-2 no-casts `packages/core/mesh/edge-client/src/edge-ws-muxer.test.ts:884`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 884-905 (`reverse.onFrame = () => sender.receiveFrame(reverse.frames.at(-1)!);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c9aee0163-3 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:823`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 823-848 (`export class SegmentedMessageLimitError extends Error {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c9aee0163-4 jsdoc-non-obvious-identifiers `packages/core/protocols/src/edge/edge.ts:198`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 198-212 (`export type JoinSpaceRequest = {`, location confidence 0.12). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c9aee0163-5 no-casts `packages/core/protocols/src/edge/edge.ts:510`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 510-521 (`data: Record<SpaceId, { diagnostics?: any & { redFlags: string[] }; fetchErro...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d1c6d6934f1353865b3fe25531f0f260aee2082c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 112 uncertain, 71 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 137 (63 verdicts re-asked with context the model requested)
estimated input tokens: 2277360
billed input tokens: 2265160 (cost $0.0951)
measured chars per token: 3.02
```
