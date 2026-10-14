---
branch: dm/sharp-faraday-quo6hw
commit: 1de2197162d2ecca288c832d5a13c2ecbddd2d9e
base: 936271c64a86930b1e8f810a15b7b861608219ab
mode: fast
createdAt: 2026-10-01T12:13:33.159Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, use-context-scoped-cancellation]
reviewId: 1de21971
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1de21971-1 - ignored - errors-extend-base-error - packages/core/compute/mcp-server/src/internal/script-isolate.ts:22
- 1de21971-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/internal/script-isolate.ts:82
- 1de21971-3 - ignored - use-context-scoped-cancellation - packages/core/compute/mcp-server/src/internal/script.ts:171
- 1de21971-4 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1074
- 1de21971-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/McpServer.ts:868

## Issues

# ERROR 1de21971-1 errors-extend-base-error `packages/core/compute/mcp-server/src/internal/script-isolate.ts:22`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 22-35 (`export const module = ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1de21971-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/internal/script-isolate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 82-93 (`const __program = ({ spaceId, print, invoke, queryOperations, loadSkill }) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1de21971-3 use-context-scoped-cancellation `packages/core/compute/mcp-server/src/internal/script.ts:171`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 171-184 (`const rejectAfter = (duration: Duration.Duration): { promise: Promise<never>;...`, location confidence 0.96). Judged with added `diff, importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1de21971-4 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1074`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1074-1097 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1de21971-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/McpServer.ts:868`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 868-893 (`export const resolveDownload = (`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `936271c64a86930b1e8f810a15b7b861608219ab`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 142 uncertain, 59 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 190 (98 verdicts re-asked with context the model requested)
estimated input tokens: 2832227
billed input tokens: 2688499 (cost $0.1129)
measured chars per token: 3.16
```
