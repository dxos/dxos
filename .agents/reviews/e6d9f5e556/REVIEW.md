---
branch: claude/edge-credit-flow-control-ssbyan
commit: e6d9f5e55672a329ea471fb6a6302d3a00c3e90b
base: 60090e70b4d3fb448e9fa4d6aed1cab97820994c
mode: fast
createdAt: 2026-10-15T17:44:47.292Z
isFinalized: true
groups: 80
rules: [errors-extend-base-error, jsdoc-non-obvious-identifiers, log-fire-and-forget-rejections, no-casts, no-sleep-in-test, no-try-catch-in-effect-code]
reviewId: e6d9f5e556
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e6d9f5e556-1 - ignored - no-sleep-in-test - packages/core/mesh/edge-client/src/edge-client.test.ts:94
- e6d9f5e556-2 - ignored - no-try-catch-in-effect-code - packages/core/mesh/edge-client/src/edge-client.ts:385
- e6d9f5e556-3 - ignored - log-fire-and-forget-rejections - packages/core/mesh/edge-client/src/edge-ws-connection.ts:389
- e6d9f5e556-4 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:907
- e6d9f5e556-5 - ignored - jsdoc-non-obvious-identifiers - packages/core/protocols/src/edge/edge.ts:198
- e6d9f5e556-6 - ignored - no-casts - packages/core/protocols/src/edge/edge.ts:543

## Issues

# WARN e6d9f5e556-1 no-sleep-in-test `packages/core/mesh/edge-client/src/edge-client.test.ts:94`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 94-105 (`setTimeout(() => admitConnection.wake(), 20);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6d9f5e556-2 no-try-catch-in-effect-code `packages/core/mesh/edge-client/src/edge-client.ts:385`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 385-396 (`try {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6d9f5e556-3 log-fire-and-forget-rejections `packages/core/mesh/edge-client/src/edge-ws-connection.ts:389`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 389-400 (`protected override async _close(): Promise<void> {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e6d9f5e556-4 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:907`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 907-929 (`const difference = (total: FlowControlAmount | undefined, base: FlowControlAm...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6d9f5e556-5 jsdoc-non-obvious-identifiers `packages/core/protocols/src/edge/edge.ts:198`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 198-212 (`export type JoinSpaceRequest = {`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e6d9f5e556-6 no-casts `packages/core/protocols/src/edge/edge.ts:543`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 543-566 (`export const ErrorCodec = Object.freeze({`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `60090e70b4d3fb448e9fa4d6aed1cab97820994c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 191 uncertain, 143 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 219 (121 verdicts re-asked with context the model requested)
estimated input tokens: 3394033
billed input tokens: 3394744 (cost $0.1426)
measured chars per token: 3.00
```
