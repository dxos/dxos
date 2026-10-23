---
branch: claude/plugin-code-graph
commit: 983c7801ef38d6fa74bc0bc0f1b50530654fcc87
base: b4798aa596ad625db586725cc0646b77f630238b
mode: fast
createdAt: 2026-10-23T09:10:23.162Z
isFinalized: true
groups: 269
rules: [effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, namespace-export-with-internal-hiding, no-try-catch-in-effect-code, no-unused-new-api, story-for-new-ui-component, toolbars-are-menu-actions]
reviewId: 983c7801
---

_0 error(s), 15 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 983c7801-1 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/client/index.ts:1
- 983c7801-2 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:73
- 983c7801-3 - ignored - story-for-new-ui-component - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:74
- 983c7801-4 - ignored - no-unused-new-api - packages/plugins/plugin-code-graph/src/containers/index.ts:1
- 983c7801-5 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/graph/Iri.ts:1
- 983c7801-6 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-code-graph/src/graph/Iri.ts:36
- 983c7801-7 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/graph/Model.ts:1
- 983c7801-8 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-code-graph/src/index.ts:1
- 983c7801-9 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/index.ts:1
- 983c7801-10 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code-graph/src/operations/util.ts:45
- 983c7801-11 - resolved - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-code-graph/src/operations/util.ts:68
- 983c7801-12 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/skills/index.ts:1
- 983c7801-13 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/vite-plugin/CodeIndexMiddleware.ts:1
- 983c7801-14 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-code-graph/src/vite-plugin/CodeIndexMiddleware.ts:120
- 983c7801-15 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/vite-plugin/McpClient.ts:1

## Issues

# WARN 983c7801-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/client/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-7 (`export * as CodeIndexClient from './CodeIndexClient.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-2 toolbars-are-menu-actions `packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 73-84 (`onClick={() => onExpand?.('out')}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-3 story-for-new-ui-component `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:74`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 74-85 (`export const CodeGraphArticle = ({ role, subject, attendableId }: CodeGraphAr...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-4 no-unused-new-api `packages/plugins/plugin-code-graph/src/containers/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.82. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-5 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/graph/Iri.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-18 (`import { type CodeGraph } from '#types';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-6 no-try-catch-in-effect-code `packages/plugins/plugin-code-graph/src/graph/Iri.ts:36`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 36-44 (`const decode = (value: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-7 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/graph/Model.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-16 (`import { type CodeGraph } from '#types';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-8 namespace-export-with-internal-hiding `packages/plugins/plugin-code-graph/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-8 (`export * as CodeGraphPlugin from './CodeGraphPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-9 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-8 (`export * as CodeGraphPlugin from './CodeGraphPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code-graph/src/operations/util.ts:45`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 45-56 (`export const addPatch = (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-11 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-code-graph/src/operations/util.ts:68`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.84. The likeliest place is lines 68-79 (`export const removeNodes = (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-12 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as CodeGraphSkill from './CodeGraphSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-13 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/vite-plugin/CodeIndexMiddleware.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-13 (`import type { IncomingMessage, ServerResponse } from 'node:http';`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-14 no-try-catch-in-effect-code `packages/plugins/plugin-code-graph/src/vite-plugin/CodeIndexMiddleware.ts:120`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 120-131 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 983c7801-15 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/vite-plugin/McpClient.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-14 (`import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b4798aa596ad625db586725cc0646b77f630238b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 15 violations written to fragments, 311 uncertain, 2060 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 965 (206 verdicts re-asked with context the model requested)
estimated input tokens: 4402887
billed input tokens: 4041610 (cost $0.1697)
measured chars per token: 3.27
```
