---
branch: dm/oct-23
commit: 9270fe7b6cd51f15b74b67cd1d1297ac80fd924a
base: f55e99227bb5bc200a430a885542dda01bd222b7
mode: fast
createdAt: 2026-10-23T13:48:41.438Z
isFinalized: true
groups: 161
rules: [atom-lifetime-bound-to-owner, business-logic-out-of-ui, design-tokens-not-raw-spacing-sizing, import-as-namespace-is-all-or-nothing]
reviewId: 9270fe7b
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9270fe7b-1 - resolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:380
- 9270fe7b-2 - ignored - business-logic-out-of-ui - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:402
- 9270fe7b-3 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/graph/Kind.ts:1
- 9270fe7b-4 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/graph/Semantic.ts:1
- 9270fe7b-5 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/vite-plugin/McpClient.ts:1
- 9270fe7b-6 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:290

## Issues

# WARN 9270fe7b-1 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:380`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 380-391 (`}) => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9270fe7b-2 business-logic-out-of-ui `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:402`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 402-413 (`const useResourceInfo = (nodes: readonly CodeGraph.Node[], invokePromise: Inv...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9270fe7b-3 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/graph/Kind.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import type * as Tag from '@dxos/react-ui/Tag';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9270fe7b-4 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/graph/Semantic.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-22 (`import { Dsl, type Scene, SemanticEngine } from '@dxos/diagram';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9270fe7b-5 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/vite-plugin/McpClient.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-15 (`import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9270fe7b-6 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:290`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.90. The likeliest place is lines 290-301 (`export const createDynamicProjection = ({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f55e99227bb5bc200a430a885542dda01bd222b7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 209 uncertain, 716 clean, 0 unanswered
- left for an agentic reviewer: 82 batch(es)

```text
requests: 408 (105 verdicts re-asked with context the model requested)
estimated input tokens: 2634005
billed input tokens: 2496721 (cost $0.1049)
measured chars per token: 3.16
```
