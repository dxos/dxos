---
branch: claude/edge-credit-flow-control-ssbyan
commit: beae6c6a8566290957e84c338be945becd5d32a4
base: 60090e70b4d3fb448e9fa4d6aed1cab97820994c
mode: fast
createdAt: 2026-10-15T16:14:27.570Z
isFinalized: true
groups: 80
rules: [errors-extend-base-error, log-fire-and-forget-rejections, no-casts, no-sleep-in-test, no-try-catch-in-effect-code]
reviewId: beae6c6a85
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- beae6c6a85-1 - ignored - no-sleep-in-test - packages/core/mesh/edge-client/src/edge-client.test.ts:94
- beae6c6a85-2 - ignored - no-try-catch-in-effect-code - packages/core/mesh/edge-client/src/edge-client.ts:397
- beae6c6a85-3 - ignored - log-fire-and-forget-rejections - packages/core/mesh/edge-client/src/edge-ws-connection.ts:389
- beae6c6a85-4 - ignored - errors-extend-base-error - packages/core/mesh/edge-client/src/edge-ws-muxer.ts:884
- beae6c6a85-5 - ignored - no-casts - packages/core/protocols/src/edge/edge.ts:543

## Issues

# WARN beae6c6a85-1 no-sleep-in-test `packages/core/mesh/edge-client/src/edge-client.test.ts:94`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 94-105 (`setTimeout(() => admitConnection.wake(), 20);`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN beae6c6a85-2 no-try-catch-in-effect-code `packages/core/mesh/edge-client/src/edge-client.ts:397`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 397-408 (`throw err;`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN beae6c6a85-3 log-fire-and-forget-rejections `packages/core/mesh/edge-client/src/edge-ws-connection.ts:389`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 389-400 (`this._ws?.close();`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR beae6c6a85-4 errors-extend-base-error `packages/core/mesh/edge-client/src/edge-ws-muxer.ts:884`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 884-906 (`const difference = (total: FlowControlAmount | undefined, base: FlowControlAm...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR beae6c6a85-5 no-casts `packages/core/protocols/src/edge/edge.ts:543`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 543-566 (`export const ErrorCodec = Object.freeze({`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `60090e70b4d3fb448e9fa4d6aed1cab97820994c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 186 uncertain, 147 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 207 (122 verdicts re-asked with context the model requested)
estimated input tokens: 3243812
billed input tokens: 3237467 (cost $0.1360)
measured chars per token: 3.01
```
