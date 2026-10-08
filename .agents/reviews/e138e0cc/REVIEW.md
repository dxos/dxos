---
branch: dm/wonderful-hawking-0g7679
commit: e138e0ccd1ed6c4a1bee5ebbcf97b8e1eaed67ac
base: 1b2e9f3361024cf58eca72bd43371cbb9ab84fb2
mode: fast
createdAt: 2026-10-02T11:35:51.263Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition]
reviewId: e138e0cc
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e138e0cc-1 - ignored - errors-extend-base-error - packages/core/compute/mcp-server/src/internal/script-isolate.ts:23
- e138e0cc-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/internal/script-isolate.ts:83
- e138e0cc-3 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1175

## Issues

# ERROR e138e0cc-1 errors-extend-base-error `packages/core/compute/mcp-server/src/internal/script-isolate.ts:23`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 23-36 (`export const module = ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN e138e0cc-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/internal/script-isolate.ts:83`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 83-94 (`const __program = ({ spaceId, print, invoke, queryOperations, loadSkill }) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e138e0cc-3 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1175`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1175-1198 (`}),`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1b2e9f3361024cf58eca72bd43371cbb9ab84fb2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 148 uncertain, 91 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 202 (92 verdicts re-asked with context the model requested)
estimated input tokens: 2799982
billed input tokens: 2684424 (cost $0.1127)
measured chars per token: 3.13
```
