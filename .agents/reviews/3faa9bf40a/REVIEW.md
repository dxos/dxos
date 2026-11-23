---
branch: dm/trusting-goodall-baxvow
commit: 3faa9bf40a3bdda42be7a6ee96b25ead201f9533
base: 500360c48e82224aabbd806029545fd854a5e0b6
mode: fast
createdAt: 2026-11-06T10:21:14.019Z
isFinalized: true
groups: 157
rules: [declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-lint-suppression-to-pass, no-try-catch-in-effect-code, one-changeset-per-pr, one-name-one-export-per-concept, retries-via-schedule-with-evidence, reuse-shared-test-layer, structured-logging-not-console, use-context-scoped-cancellation, workerd-variant-imports-conditioned-barrel]
reviewId: 3faa9bf40a
---

_0 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3faa9bf40a-1 - resolved - one-changeset-per-pr - .changeset/dx-publish-vite-in-process.md:1
- 3faa9bf40a-2 - ignored - retries-via-schedule-with-evidence - packages/core/compute/assistant-evals/src/claude-harness.ts:249
- 3faa9bf40a-3 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/claude-harness.ts:440
- 3faa9bf40a-4 - ignored - structured-logging-not-console - packages/core/compute/assistant-evals/src/edge-agent-session.manual.test.ts:125
- 3faa9bf40a-5 - ignored - no-lint-suppression-to-pass - packages/core/compute/plugin-builder/src/bin/publish-release.ts:1
- 3faa9bf40a-6 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-builder/src/bin/publish-release.ts:74
- 3faa9bf40a-7 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/publish-release.ts:86
- 3faa9bf40a-8 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:194
- 3faa9bf40a-9 - ignored - use-context-scoped-cancellation - packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:54
- 3faa9bf40a-10 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-agent/dx.config.ts:93
- 3faa9bf40a-11 - resolved - reuse-shared-test-layer - packages/plugins/plugin-agent/src/brain/BrainWire.test.ts:25
- 3faa9bf40a-12 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/brain/index.ts:1
- 3faa9bf40a-13 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-agent/src/index.ts:1
- 3faa9bf40a-14 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/DiscordSource.ts:1
- 3faa9bf40a-15 - ignored - one-name-one-export-per-concept - packages/plugins/plugin-discord/src/DiscordSource.ts:13
- 3faa9bf40a-16 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-discord/src/services/discord.ts:146
- 3faa9bf40a-17 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-registry/src/commands/registry/build.ts:85
- 3faa9bf40a-18 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-registry/src/commands/registry/publish.ts:141
- 3faa9bf40a-19 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-registry/src/commands/registry/publish.ts:318
- 3faa9bf40a-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/common/capabilities.ts:351

## Issues

# WARN 3faa9bf40a-1 one-changeset-per-pr `.changeset/dx-publish-vite-in-process.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.97. This is a single-shot classifier: confirm against the rule before acting.

Resolved: Merged the two changesets into `.changeset/dx-publish-vite-in-process.md`, naming `@dxos/app-framework` and `@dxos/plugin-registry` (one per publish group) with one rewritten body; deleted `edge-bundle-host-services.md`.

# WARN 3faa9bf40a-2 retries-via-schedule-with-evidence `packages/core/compute/assistant-evals/src/claude-harness.ts:249`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 249-260 (`const createEdgeAgent = async (client: Client): Promise<void> => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: lines 249-260 of `claude-harness.ts` are unchanged from main; this PR only exports `replicateToEdge`.

# WARN 3faa9bf40a-3 flat-layer-composition `packages/core/compute/assistant-evals/src/claude-harness.ts:440`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 440-451 (`const aiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiS...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: lines 440-451 of `claude-harness.ts` are unchanged from main.

# WARN 3faa9bf40a-4 structured-logging-not-console `packages/core/compute/assistant-evals/src/edge-agent-session.manual.test.ts:125`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 125-136 (`console.log('agent replied', { reply });`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Another author's manual test, run by hand with its output meant for the operator; `assistant-evals` has no `@dxos/log` dependency, so switching is not a one-line fix.

# WARN 3faa9bf40a-5 no-lint-suppression-to-pass `packages/core/compute/plugin-builder/src/bin/publish-release.ts:1`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.82. The likeliest place is lines 1-12 (`#!/usr/bin/env node`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: The `no-console` disable is the convention of every sibling bin in `plugin-builder/src/bin`: stdout is this CLI's interface, including the raw `::warning::` workflow command, which `log` would reformat.

# WARN 3faa9bf40a-6 no-try-catch-in-effect-code `packages/core/compute/plugin-builder/src/bin/publish-release.ts:74`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 74-85 (`const { moduleUrl } = await http.uploadPluginBundle(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

Ignored: A plain-async CLI bin, not Effect code; the catch narrows one typed error (conflict reported as stale) and rethrows the rest, so nothing is swallowed. Converting the bin to Effect alone would diverge from its three sibling bins.

# WARN 3faa9bf40a-7 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/publish-release.ts:86`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 86-99 (`console.log(`::warning::${message}`);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Same as -5: CI reads this bin's stdout lines, and `::warning::` must be a raw stdout line.

# WARN 3faa9bf40a-8 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:194`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 194-206 (`const invoke: Host['invoke'] = async (request, env, scope = {}) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: `PluginHost.ts` lines 194-206 are unchanged from main; the PR only passes the adapters into `withHostServices`.

# WARN 3faa9bf40a-9 use-context-scoped-cancellation `packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:54`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 54-65 (`const InspectHandler = Inspect.pipe(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: `TestPlugin.ts` lines 54-65 (`InspectHandler`) are unchanged from main.

# WARN 3faa9bf40a-10 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-agent/dx.config.ts:93`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.81. The likeliest place is lines 93-104 (`() => import('./src/capabilities/operation-handler.ts', { with: { type: 'modu...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: line 93 (`operationHandler`) is unchanged from main; the PR's own `EdgeBrain` module is a `dx.config.ts` module scoped by `environments: ['workerd']`, which is the shape the rule asks for.

# WARN 3faa9bf40a-11 reuse-shared-test-layer `packages/plugins/plugin-agent/src/brain/BrainWire.test.ts:25`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.83. The likeliest place is lines 25-29 (`const agents: AgentService.Service = {`, location confidence 0.66). Judged with added `siblings, similar` context after a first pass of 0.64. This is a single-shot classifier: confirm against the rule before acting.

Resolved: Moved the idle `AgentService` stub, duplicated in `BrainMemory.test.ts`, into `brain/testing.ts` as `UNUSED_AGENTS`; both tests now import it.

# WARN 3faa9bf40a-12 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/brain/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as BrainWire from './BrainWire.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: False positive: `BrainWire.ts` carries `// @import-as-namespace`, is capital-case, and `brain/index.ts` re-exports it under the same name; every consumer imports the whole namespace. This sub-barrel is the shape the repo's `@dxos/rules(dxos-subpath-exports)` lint rule requires.

# WARN 3faa9bf40a-13 namespace-export-with-internal-hiding `packages/plugins/plugin-agent/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * as AgentKnowledge from './AgentKnowledge.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `export * from './brain/index.ts'` re-exports a directory barrel that holds one explicit namespace (`BrainWire`), the shape `@dxos/rules(dxos-subpath-exports)` requires; inlining `export * as BrainWire` here fails that lint rule.

# WARN 3faa9bf40a-14 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/DiscordSource.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-12 (`export { DiscordEndpoint as Endpoint, type Endpoint as EndpointConfig } from ...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

Ignored: `DiscordSource.ts` is a facade namespace that renames internal symbols, the shape it already had on main (`Endpoint`); its public names (`Http`, `restLayerFromToken`) are consumed by dxos/edge#1467.

# WARN 3faa9bf40a-15 one-name-one-export-per-concept `packages/plugins/plugin-discord/src/DiscordSource.ts:13`

System One judges this a likely violation of `one-name-one-export-per-concept` (One name and one export path per concept), p=0.86. The likeliest place is lines 13-16 (`} from './services/discord.ts';`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

Ignored: False positive: `DiscordSource` is the package's only public export path; `services/discord.ts` and `services/index.ts` are internal and not exported from the package barrel.

# WARN 3faa9bf40a-16 declare-optional-services-with-noop-layers `packages/plugins/plugin-discord/src/services/discord.ts:146`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.88. The likeliest place is lines 146-157 (`const makeRestLayer = (token: string, tokenKind: TokenKind): Layer.Layer<Disc...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Absent `DiscordHttp` selects a different fetch path (proxy or direct), not a noop; requiring it would change every `makeDiscordLayer*` caller and each host's wiring, a larger change than this review.

# WARN 3faa9bf40a-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-registry/src/commands/registry/build.ts:85`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 85-96 (`const importFrom = (dir: string, specifier: string) =>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `importFrom` and `buildInProcess` in `build.ts` now use `Effect.fnUntraced` instead of a hand-wrapped `Effect.gen`.

# WARN 3faa9bf40a-18 declare-optional-services-with-noop-layers `packages/plugins/plugin-registry/src/commands/registry/publish.ts:141`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 141-152 (`const describer = yield* Effect.serviceOption(BundleDescriber.Service);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: the `Effect.serviceOption(BundleDescriber.Service)` read at line 141 is unchanged from main.

# WARN 3faa9bf40a-19 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-registry/src/commands/registry/publish.ts:318`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 318-329 (`const readBundleFiles = (outdir: string) =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: `readBundleFiles` at line 318 of `publish.ts` is unchanged from main.

# WARN 3faa9bf40a-20 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/common/capabilities.ts:351`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 351-362 (`export const getAtomValue = <T>(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

Ignored: Out of scope: `getAtomValue` at line 351 is unchanged from main; the PR only adds `HostServiceProxy`/`HostServiceAdapter`.

## Appendix

### System One pass

- model: jev-latest
- base for context: `500360c48e82224aabbd806029545fd854a5e0b6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 20 violations written to fragments, 223 uncertain, 777 clean, 0 unanswered
- left for an agentic reviewer: 84 batch(es)

```text
requests: 447 (126 verdicts re-asked with context the model requested)
estimated input tokens: 3298012
billed input tokens: 3103725 (cost $0.1304)
measured chars per token: 3.19
```
