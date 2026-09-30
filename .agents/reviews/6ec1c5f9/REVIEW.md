---
branch: dm/zen-hawking-92843m
commit: 6ec1c5f931a013a0364dd96c98238b72cdd03deb
base: 04892b42c941de35f1581c2802dba5b4b47b7ac0
mode: fast
createdAt: 2026-09-30T05:09:03.616Z
isFinalized: true
groups: 100
rules: [declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen]
reviewId: 6ec1c5f9
---

_0 error(s), 5 warning(s)._

# WARN 6ec1c5f9-1 effect-fn-not-hand-wrapped-gen `packages/apps/composer-app/src/workers/observability-plugin.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 39-50 (`const Observability = Capability.inlineModule(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6ec1c5f9-2 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/url-loader.ts:300`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 300-311 (`export const preload = (options: PreloadOptions = {}): Effect.Effect<Plugin.P...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6ec1c5f9-3 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/worker/PluginWorker.browser.test.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 28-40 (`const makeEchoClient = (port: MessagePort) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6ec1c5f9-4 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/worker/PluginWorker.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 116-127 (`),`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6ec1c5f9-5 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:81`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 81-92 (`export const registerReplicator = <Self>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.
