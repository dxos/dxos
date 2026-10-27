---
branch: dm/zen-hawking-92843m
commit: 669e356f33fbe418fe27c180a2fb08a159d8a88a
base: f351e2bacbaf70165c5d0716821ceac00e55e597
mode: fast
createdAt: 2026-10-27T11:42:28.256Z
isFinalized: true
groups: 157
rules: [barrel-imports-not-internal-paths, bounded-live-state, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts, no-try-catch-in-effect-code]
reviewId: 669e356f3
---

_2 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 669e356f3-1 - ignored - barrel-imports-not-internal-paths - packages/apps/composer-app/src/workers/client-plugin.ts:1
- 669e356f3-2 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:539
- 669e356f3-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/capability.ts:539
- 669e356f3-4 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:611
- 669e356f3-5 - ignored - no-try-catch-in-effect-code - packages/sdk/app-framework/src/core/url-loader.ts:74
- 669e356f3-6 - ignored - bounded-live-state - packages/sdk/app-framework/src/core/url-loader.ts:93
- 669e356f3-7 - resolved - error-messages-carry-context - packages/sdk/app-framework/src/core/url-loader.ts:190
- 669e356f3-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/url-loader.ts:300
- 669e356f3-9 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-framework/src/index.ts:1
- 669e356f3-10 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/index.ts:13
- 669e356f3-11 - ignored - no-try-catch-in-effect-code - packages/sdk/app-framework/src/plugin-cli/maker-defaults.ts:40
- 669e356f3-12 - resolved - flat-layer-composition - packages/sdk/app-framework/src/worker/PluginWorker.ts:125
- 669e356f3-13 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:87
- 669e356f3-14 - resolved - flat-layer-composition - packages/sdk/client-services/src/internal/worker/worker-runtime.ts:248

## Issues

# WARN 669e356f3-1 barrel-imports-not-internal-paths `packages/apps/composer-app/src/workers/client-plugin.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-10 (`import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-2 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:539`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.86. The likeliest place is lines 539-560 (`export const lazyModule = <`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-3 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/capability.ts:539`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 539-560 (`export const lazyModule = <`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 669e356f3-4 no-casts `packages/sdk/app-framework/src/core/capability.ts:611`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 611-633 (`const props = spec.props ? spec.props(options) : (options as unknown as Props);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-5 no-try-catch-in-effect-code `packages/sdk/app-framework/src/core/url-loader.ts:74`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 74-85 (`const getPersistedRemotePlugins = (storage: Storage, key: string): RemotePlug...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 669e356f3-6 bounded-live-state `packages/sdk/app-framework/src/core/url-loader.ts:93`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 93-102 (`const persistRemotePlugin = (storage: Storage, key: string, entry: RemotePlug...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-7 error-messages-carry-context `packages/sdk/app-framework/src/core/url-loader.ts:190`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 190-201 (`export const normalizePluginExport = (mod: Record<string, unknown>): Plugin.P...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-8 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/url-loader.ts:300`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 300-311 (`export const preload = (options: PreloadOptions = {}): Effect.Effect<Plugin.P...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-9 namespace-export-with-internal-hiding `packages/sdk/app-framework/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.92. The likeliest place is lines 1-12 (`export * from './common/index.ts';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-10 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-17 (`export * as SharedPackages from './SharedPackages.ts';`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-11 no-try-catch-in-effect-code `packages/sdk/app-framework/src/plugin-cli/maker-defaults.ts:40`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 40-51 (`let pkgJsonPath: string;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-12 flat-layer-composition `packages/sdk/app-framework/src/worker/PluginWorker.ts:125`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 125-136 (`const stackContext = yield* Layer.build(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-13 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:87`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 87-98 (`export const registerReplicator = <Self>(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 669e356f3-14 flat-layer-composition `packages/sdk/client-services/src/internal/worker/worker-runtime.ts:248`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 248-259 (`yield* Layer.build(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f351e2bacbaf70165c5d0716821ceac00e55e597`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 208 uncertain, 1075 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 539 (126 verdicts re-asked with context the model requested)
estimated input tokens: 4128539
billed input tokens: 3852779 (cost $0.1618)
measured chars per token: 3.21
```
