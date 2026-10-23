---
branch: claude/plugin-code-graph
commit: 73488929365a5cb7bf8cf5bab7e8834982113118
base: origin/main
mode: fast
createdAt: 2026-10-23T08:42:11.808Z
isFinalized: true
groups: 268
rules: [bounded-live-state, business-logic-out-of-ui, code-not-in-strings, create-then-add-operations, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, namespace-export-with-internal-hiding, no-bare-ref-schema-alias, no-casts, no-styling-wrapper-divs, no-try-catch-in-effect-code, no-unused-new-api, story-for-new-ui-component, structural-regions-use-design-system-components, toolbars-are-menu-actions]
reviewId: 73488929
---

_3 error(s), 23 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 73488929-1 - resolved - errors-extend-base-error - packages/plugins/plugin-code-graph/src/client/CodeIndexClient.ts:1
- 73488929-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code-graph/src/client/CodeIndexClient.ts:27
- 73488929-3 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/client/index.ts:1
- 73488929-4 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code-graph/src/components/CodeGraphCanvas/CodeGraphCanvas.tsx:61
- 73488929-5 - resolved - story-for-new-ui-component - packages/plugins/plugin-code-graph/src/components/CodeGraphDiagram/CodeGraphDiagram.tsx:23
- 73488929-6 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:44
- 73488929-7 - resolved - structural-regions-use-design-system-components - packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:44
- 73488929-8 - resolved - story-for-new-ui-component - packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:44
- 73488929-9 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:68
- 73488929-10 - ignored - story-for-new-ui-component - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:78
- 73488929-11 - resolved - toolbars-are-menu-actions - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:174
- 73488929-12 - resolved - business-logic-out-of-ui - packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:240
- 73488929-13 - ignored - no-casts - packages/plugins/plugin-code-graph/src/containers/index.ts:1
- 73488929-14 - ignored - no-unused-new-api - packages/plugins/plugin-code-graph/src/containers/index.ts:1
- 73488929-15 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/graph/Iri.ts:1
- 73488929-16 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/graph/Model.ts:1
- 73488929-17 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-code-graph/src/index.ts:1
- 73488929-18 - resolved - create-then-add-operations - packages/plugins/plugin-code-graph/src/operations/create.ts:12
- 73488929-19 - resolved - bounded-live-state - packages/plugins/plugin-code-graph/src/operations/util.ts:45
- 73488929-20 - resolved - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-code-graph/src/operations/util.ts:57
- 73488929-21 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/skills/index.ts:1
- 73488929-22 - resolved - no-bare-ref-schema-alias - packages/plugins/plugin-code-graph/src/types/CodeGraphOperation.ts:1
- 73488929-23 - resolved - code-not-in-strings - packages/plugins/plugin-code-graph/src/vite-plugin/code-index-middleware.test.ts:12
- 73488929-24 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-code-graph/src/vite-plugin/code-index-middleware.ts:84
- 73488929-25 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-code-graph/src/vite-plugin/index.ts:1
- 73488929-26 - resolved - error-messages-carry-context - packages/plugins/plugin-code-graph/src/vite-plugin/mcp-client.ts:35

## Issues

# ERROR 73488929-1 errors-extend-base-error `packages/plugins/plugin-code-graph/src/client/CodeIndexClient.ts:1`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 1-15 (`import * as Data from 'effect/Data';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code-graph/src/client/CodeIndexClient.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 27-38 (`export const call = (`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-3 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/client/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-7 (`export * as CodeIndexClient from './CodeIndexClient.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-4 no-styling-wrapper-divs `packages/plugins/plugin-code-graph/src/components/CodeGraphCanvas/CodeGraphCanvas.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-69 (`<div className='flex items-center gap-2 min-w-0'>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-5 story-for-new-ui-component `packages/plugins/plugin-code-graph/src/components/CodeGraphDiagram/CodeGraphDiagram.tsx:23`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 23-34 (`export const CodeGraphDiagram = ({ objects, selected, onSelect }: CodeGraphDi...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-6 no-styling-wrapper-divs `packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 44-55 (`export const NodeDetails = ({ node, facts, incoming, error, onExpand, onRemov...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-7 structural-regions-use-design-system-components `packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:44`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.83. The likeliest place is lines 44-55 (`export const NodeDetails = ({ node, facts, incoming, error, onExpand, onRemov...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-8 story-for-new-ui-component `packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:44`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.92. The likeliest place is lines 44-55 (`export const NodeDetails = ({ node, facts, incoming, error, onExpand, onRemov...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-9 toolbars-are-menu-actions `packages/plugins/plugin-code-graph/src/components/NodeDetails/NodeDetails.tsx:68`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 68-79 (`label={t('expand-out.label')}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-10 story-for-new-ui-component `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:78`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 78-89 (`export const CodeGraphArticle = ({ role, subject }: CodeGraphArticleProps) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-11 toolbars-are-menu-actions `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:174`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 174-185 (`icon='ph--arrow-counter-clockwise--regular'`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-12 business-logic-out-of-ui `packages/plugins/plugin-code-graph/src/containers/CodeGraphArticle/CodeGraphArticle.tsx:240`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 240-251 (`CodeIndexClient.describe(iri, 40).pipe(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 73488929-13 no-casts `packages/plugins/plugin-code-graph/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-14 no-unused-new-api `packages/plugins/plugin-code-graph/src/containers/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.81. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-15 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/graph/Iri.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-18 (`import { type CodeGraph } from '#types';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-16 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/graph/Model.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-16 (`import { type CodeGraph } from '#types';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-17 namespace-export-with-internal-hiding `packages/plugins/plugin-code-graph/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-8 (`export * as CodeGraphPlugin from './CodeGraphPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-18 create-then-add-operations `packages/plugins/plugin-code-graph/src/operations/create.ts:12`

System One judges this a likely violation of `create-then-add-operations` (Create instantiates in memory and AddObject persists; don't add composite create-and-file operations), p=0.81. The likeliest place is lines 12-21 (`const handler: Operation.WithHandler<typeof CodeGraphOperation.Create> = Code...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 73488929-19 bounded-live-state `packages/plugins/plugin-code-graph/src/operations/util.ts:45`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 45-56 (`export const addPatch = (graph: CodeGraph.CodeGraph, patch: Model.Patch): Cod...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-20 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-code-graph/src/operations/util.ts:57`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.82. The likeliest place is lines 57-68 (`export const removeNodes = (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-21 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as CodeGraphSkill from './CodeGraphSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-22 no-bare-ref-schema-alias `packages/plugins/plugin-code-graph/src/types/CodeGraphOperation.ts:1`

System One judges this a likely violation of `no-bare-ref-schema-alias` (Declare a Ref field inline, not through a module-level alias), p=0.97. The likeliest place is lines 1-16 (`import * as Schema from 'effect/Schema';`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-23 code-not-in-strings `packages/plugins/plugin-code-graph/src/vite-plugin/code-index-middleware.test.ts:12`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.90. The likeliest place is lines 12-24 (`const rl = require('node:readline').createInterface({ input: process.stdin });`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-24 no-try-catch-in-effect-code `packages/plugins/plugin-code-graph/src/vite-plugin/code-index-middleware.ts:84`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 84-95 (`if (!isRecord(request) || typeof request.tool !== 'string' || !TOOLS.has(requ...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-25 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code-graph/src/vite-plugin/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-10 (`export * from './code-index-vite-plugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 73488929-26 error-messages-carry-context `packages/plugins/plugin-code-graph/src/vite-plugin/mcp-client.ts:35`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 35-46 (`export const payloadOf = (result: unknown): unknown => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/main`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 26 violations written to fragments, 295 uncertain, 2034 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 947 (185 verdicts re-asked with context the model requested)
estimated input tokens: 4231799
billed input tokens: 3876808 (cost $0.1628)
measured chars per token: 3.27
```
