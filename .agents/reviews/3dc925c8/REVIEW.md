---
branch: dm/optimistic-galileo-he1dbv
commit: 3dc925c8421124bfe5c905f5d40b45225446201b
base: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
mode: fast
createdAt: 2026-10-27T04:46:06.571Z
isFinalized: true
groups: 98
rules: [atom-lifetime-bound-to-owner, bounded-live-state, code-not-in-strings, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, inject-dependencies-via-constructor, no-casts, no-sleep-in-test, no-trivial-wrappers-over-official-apis]
reviewId: 3dc925c8
---

_3 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3dc925c8-1 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:404
- 3dc925c8-2 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:548
- 3dc925c8-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/capability.ts:548
- 3dc925c8-4 - ignored - inject-dependencies-via-constructor - packages/sdk/app-framework/src/core/hot-modules.ts:54
- 3dc925c8-5 - ignored - bounded-live-state - packages/sdk/app-framework/src/core/hot-modules.ts:108
- 3dc925c8-6 - ignored - atom-lifetime-bound-to-owner - packages/sdk/app-framework/src/core/plugin-manager/manager-state.ts:96
- 3dc925c8-7 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:433
- 3dc925c8-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:676
- 3dc925c8-9 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:39
- 3dc925c8-10 - ignored - code-not-in-strings - packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:106
- 3dc925c8-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:106
- 3dc925c8-12 - ignored - no-sleep-in-test - packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:202

## Issues

# ERROR 3dc925c8-1 no-casts `packages/sdk/app-framework/src/core/capability.ts:404`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 404-423 (`[ContributionTypeId]: capability as unknown as IdentifierOf<C>,`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-2 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:548`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 548-571 (`export const lazyModule = <`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-3 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/capability.ts:548`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 548-571 (`export const lazyModule = <`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-4 inject-dependencies-via-constructor `packages/sdk/app-framework/src/core/hot-modules.ts:54`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.86. The likeliest place is lines 54-59 (`const state: State = globalThis.__DX_HOT_MODULES__?.state ?? {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3dc925c8-5 bounded-live-state `packages/sdk/app-framework/src/core/hot-modules.ts:108`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.85. The likeliest place is lines 108-111 (`export const register = (manager: Reloadable): void => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-6 atom-lifetime-bound-to-owner `packages/sdk/app-framework/src/core/plugin-manager/manager-state.ts:96`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 96-107 (`this.#registry = registry;`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3dc925c8-7 no-casts `packages/sdk/app-framework/src/core/plugin.ts:433`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 433-456 (`export function addModule<T>(`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-8 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:676`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 676-690 (`return yield* Effect.fail(new LazyPluginError({ context: { id, reason: 'missi...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-9 no-trivial-wrappers-over-official-apis `packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:39`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.80. The likeliest place is lines 39-50 (`const checked = (loader) => () => loader().then((module) => ({ ...module, def...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-10 code-not-in-strings `packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:106`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.90. The likeliest place is lines 106-117 (`const valueBody = (version: string) => ``, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-11 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:106`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 106-117 (`const valueBody = (version: string) => ``, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3dc925c8-12 no-sleep-in-test `packages/sdk/app-framework/src/vite-plugin/hot-modules/hot-modules.e2e.test.ts:202`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 202-213 (`expect(await page.evaluate('window.__hot.derived')).toBeUndefined();`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `04d5fb15a8b5e81ebbabcfc78abdadb969765750`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 355 uncertain, 264 clean, 0 unanswered
- left for an agentic reviewer: 84 batch(es)

```text
requests: 379 (205 verdicts re-asked with context the model requested)
estimated input tokens: 4655189
billed input tokens: 4398808 (cost $0.1847)
measured chars per token: 3.17
```
