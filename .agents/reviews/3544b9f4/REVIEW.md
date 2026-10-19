---
branch: dm/zealous-tesla-cn8a8w
commit: 3544b9f43bb0dea08ca5ef09a8b40e85757c257f
base: 38ea01f724735d3a12189401784a882db00ede56
mode: fast
createdAt: 2026-10-01T10:50:38.751Z
isFinalized: true
groups: 60
rules: [barrel-imports-not-internal-paths, effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing]
reviewId: 3544b9f4
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3544b9f4-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- 3544b9f4-2 - ignored - barrel-imports-not-internal-paths - packages/core/compute/assistant-evals/src/McpLatency.ts:1
- 3544b9f4-3 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-evals/src/McpLatency.ts:1
- 3544b9f4-4 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:954

## Issues

# WARN 3544b9f4-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

Dismissed: `readUploadedFile` (lines 197-208) predates this PR; its diff touches only the probe lists above it.

# WARN 3544b9f4-2 barrel-imports-not-internal-paths `packages/core/compute/assistant-evals/src/McpLatency.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.83. The likeliest place is lines 1-10 (`import { Client } from '@modelcontextprotocol/sdk/client/index.js';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

Dismissed: the import block is unchanged by this PR, and `@modelcontextprotocol/sdk` exposes these paths as its public entry points, not internal files.

# WARN 3544b9f4-3 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-evals/src/McpLatency.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-10 (`import { Client } from '@modelcontextprotocol/sdk/client/index.js';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Dismissed: the import block is unchanged by this PR, and it imports from an external SDK, not a namespace module of this repo.

# WARN 3544b9f4-4 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:954`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 954-977 (`}),`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

Dismissed: lines 954-977 (the HTTP transport layer test) predate this PR; its test changes are in the skill-gate cases near the top of the file.

## Appendix

### System One pass

- model: jev-latest
- base for context: `38ea01f724735d3a12189401784a882db00ede56`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 198 uncertain, 144 clean, 0 unanswered
- left for an agentic reviewer: 53 batch(es)

```text
requests: 235 (129 verdicts re-asked with context the model requested)
estimated input tokens: 3048593
billed input tokens: 2929853 (cost $0.1231)
measured chars per token: 3.12
```
