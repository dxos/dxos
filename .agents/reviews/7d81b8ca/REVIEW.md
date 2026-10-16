---
branch: dm/nice-franklin-ncvbpc
commit: 7d81b8cad2e7c4a92f33f6d53a1fba0789ec4d83
base: 1bc475ee04f0aeb92f7d2db57e6dcf0d3cd70633
mode: fast
createdAt: 2026-10-16T15:13:44.236Z
isFinalized: true
groups: 198
rules: [bounded-live-state, code-not-in-strings, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, import-as-namespace-is-all-or-nothing, log-fire-and-forget-rejections, namespace-export-with-internal-hiding, no-env-vars-in-low-level-modules]
reviewId: 7d81b8ca
---

_1 error(s), 10 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7d81b8ca-1 - ignored - namespace-export-with-internal-hiding - packages/common/diagram/src/index.ts:1
- 7d81b8ca-2 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:13
- 7d81b8ca-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/devtools/cli-util/src/util/space.ts:25
- 7d81b8ca-4 - ignored - error-messages-carry-context - packages/devtools/cli-util/src/util/space.ts:33
- 7d81b8ca-5 - ignored - no-env-vars-in-low-level-modules - packages/devtools/drawing/autocue/fixtures/shop/api/src/queue.ts:1
- 7d81b8ca-6 - ignored - bounded-live-state - packages/devtools/drawing/autocue/fixtures/shop/api/src/server.ts:12
- 7d81b8ca-7 - resolved - namespace-export-with-internal-hiding - packages/devtools/drawing/src/index.ts:1
- 7d81b8ca-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-illustrator/src/types/DrawingOperation.ts:1
- 7d81b8ca-9 - ignored - log-fire-and-forget-rejections - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:436
- 7d81b8ca-10 - ignored - code-not-in-strings - packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:626
- 7d81b8ca-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/commands/space/share/share.ts:49

## Issues

# WARN 7d81b8ca-1 namespace-export-with-internal-hiding `packages/common/diagram/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * from './content.ts';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-2 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 13-24 (`export * as Layout from './layout.ts';`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-3 effect-fn-not-hand-wrapped-gen `packages/devtools/cli-util/src/util/space.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 25-32 (`export const getSpace = (spaceId: Key.SpaceId): Effect.Effect<Space, SpaceNot...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-4 error-messages-carry-context `packages/devtools/cli-util/src/util/space.ts:33`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.92. The likeliest place is lines 33-46 (`export const spaceIdWithDefault = (spaceId: Option.Option<Key.SpaceId>) =>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-5 no-env-vars-in-low-level-modules `packages/devtools/drawing/autocue/fixtures/shop/api/src/queue.ts:1`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.80. The likeliest place is lines 1-9 (`import { Queue } from 'bullmq';`, location confidence 1.00). Judged with added `importers, package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7d81b8ca-6 bounded-live-state `packages/devtools/drawing/autocue/fixtures/shop/api/src/server.ts:12`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.90. The likeliest place is lines 12-23 (`const app = new Hono();`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-7 namespace-export-with-internal-hiding `packages/devtools/drawing/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-6 (`export * from './render.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-illustrator/src/types/DrawingOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-9 log-fire-and-forget-rejections `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:436`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.84. The likeliest place is lines 436-447 (`'',`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-10 code-not-in-strings `packages/plugins/plugin-sandbox/src/local/LocalSandboxBackend.ts:626`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.82. The likeliest place is lines 626-632 (`const proxyPrelude = (os: NodeJS.Platform): string[] =>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7d81b8ca-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/commands/space/share/share.ts:49`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 49-60 (`});`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1bc475ee04f0aeb92f7d2db57e6dcf0d3cd70633`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 217 uncertain, 1109 clean, 0 unanswered
- left for an agentic reviewer: 83 batch(es)

```text
requests: 563 (140 verdicts re-asked with context the model requested)
estimated input tokens: 3258821
billed input tokens: 3066593 (cost $0.1288)
measured chars per token: 3.19
```
