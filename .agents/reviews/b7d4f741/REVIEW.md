---
branch: dm/laughing-einstein-axp41v
commit: b7d4f74130b0e204bb695afde8f906ba7ecc9f57
base: cab57d043d0ea366ce8855fe2f3906ad231cbdd1
mode: fast
createdAt: 2026-11-03T18:32:45.310Z
isFinalized: true
groups: 398
rules: [barrel-imports-not-internal-paths, change-behavior-inside-existing-api, code-not-in-strings, comment-hygiene, consistent-private-field-convention, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, no-retries-or-skips-for-flaky-tests, no-sleep-in-test, no-try-catch-in-effect-code, no-unused-new-api, one-changeset-per-pr, operations-resolve-database-from-service, reactive-state-via-atom-bridge, story-for-new-ui-component, structured-logging-not-console, use-context-scoped-cancellation, workaround-is-documented-and-removable, workerd-variant-imports-conditioned-barrel]
reviewId: b7d4f741
---

_5 error(s), 64 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b7d4f741-1 - ignored - one-changeset-per-pr - .changeset/echo-client-root-link-wait-close.md:1
- b7d4f741-2 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/edge-compute/src/plugin-loader/index.ts:1
- b7d4f741-3 - ignored - code-not-in-strings - packages/core/compute/edge-compute/src/plugin-loader/PluginLoader.test.ts:16
- b7d4f741-4 - ignored - code-not-in-strings - packages/core/compute/edge-compute/src/plugin-loader/PluginLoader.ts:203
- b7d4f741-5 - ignored - no-lint-suppression-to-pass - packages/core/compute/plugin-builder/src/bin/bundle-plugin.ts:1
- b7d4f741-6 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/bundle-plugin.ts:18
- b7d4f741-7 - ignored - no-lint-suppression-to-pass - packages/core/compute/plugin-builder/src/bin/check-bundle.ts:1
- b7d4f741-8 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/check-bundle.ts:33
- b7d4f741-9 - ignored - no-lint-suppression-to-pass - packages/core/compute/plugin-builder/src/bin/check-release.ts:1
- b7d4f741-10 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/check-release.ts:20
- b7d4f741-11 - ignored - namespace-export-with-internal-hiding - packages/core/compute/plugin-builder/src/index.ts:1
- b7d4f741-12 - ignored - code-not-in-strings - packages/core/compute/plugin-builder/src/load-bundle.ts:24
- b7d4f741-13 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-builder/src/PluginBundle.ts:89
- b7d4f741-14 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginCatalog.ts:43
- b7d4f741-15 - resolved - no-sleep-in-test - packages/core/echo/echo-client/src/client/echo-client.test.ts:24
- b7d4f741-16 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/client/echo-client.ts:314
- b7d4f741-17 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:374
- b7d4f741-18 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:226
- b7d4f741-19 - ignored - comment-hygiene - packages/core/echo/echo-client/src/core-db/entity-manager.ts:250
- b7d4f741-20 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:346
- b7d4f741-21 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:418
- b7d4f741-22 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2770
- b7d4f741-23 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:1043
- b7d4f741-24 - ignored - no-retries-or-skips-for-flaky-tests - packages/core/mesh/edge-client/src/edge-http-client.test.ts:18
- b7d4f741-25 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:583
- b7d4f741-26 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:1145
- b7d4f741-27 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:1145
- b7d4f741-28 - ignored - namespace-export-with-internal-hiding - packages/core/protocols/src/index.ts:1
- b7d4f741-29 - ignored - import-as-namespace-is-all-or-nothing - packages/core/protocols/src/index.ts:19
- b7d4f741-30 - ignored - no-casts - packages/devtools/cli/src/bin.ts:254
- b7d4f741-31 - ignored - flat-layer-composition - packages/devtools/cli/src/bin.ts:254
- b7d4f741-32 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:254
- b7d4f741-33 - ignored - no-try-catch-in-effect-code - packages/devtools/cli/src/util/bundle-describer.ts:36
- b7d4f741-34 - ignored - effect-fn-not-hand-wrapped-gen - packages/devtools/cli/src/util/bundle-describer.ts:66
- b7d4f741-35 - ignored - import-as-namespace-is-all-or-nothing - packages/devtools/cli/src/util/index.ts:1
- b7d4f741-36 - ignored - no-retries-or-skips-for-flaky-tests - packages/e2e/composer-e2e/src/playwright/basic.spec.ts:121
- b7d4f741-37 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-cloudflare-os/dx.config.ts:42
- b7d4f741-38 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-cloudflare-os/src/agent/Projection.ts:1
- b7d4f741-39 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63
- b7d4f741-40 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63
- b7d4f741-41 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-cloudflare-os/src/api/Client.ts:117
- b7d4f741-42 - ignored - code-not-in-strings - packages/plugins/plugin-cloudflare-os/src/api/Sandbox.ts:33
- b7d4f741-43 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-cloudflare-os/src/constants.ts:1
- b7d4f741-44 - ignored - no-casts - packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1
- b7d4f741-45 - ignored - no-unused-new-api - packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1
- b7d4f741-46 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:61
- b7d4f741-47 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:85
- b7d4f741-48 - ignored - story-for-new-ui-component - packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:26
- b7d4f741-49 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-cloudflare-os/src/index.ts:1
- b7d4f741-50 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-cloudflare-os/src/operations/index.ts:1
- b7d4f741-51 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-cloudflare-os/src/types/CloudflareOs.ts:1
- b7d4f741-52 - ignored - no-lint-suppression-to-pass - packages/plugins/plugin-cloudflare-os/src/types/CloudflareOsOperation.ts:13
- b7d4f741-53 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-registry/src/commands/registry/publish.ts:25
- b7d4f741-54 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-registry/src/commands/registry/publish.ts:127
- b7d4f741-55 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-registry/src/commands/registry/publish.ts:304
- b7d4f741-56 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-registry/src/index.ts:1
- b7d4f741-57 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-registry/src/index.ts:1
- b7d4f741-58 - ignored - error-messages-carry-context - packages/plugins/plugin-registry/src/util/loader.ts:81
- b7d4f741-59 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-registry/src/util/resolve.ts:75
- b7d4f741-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-registry/src/util/resolve.ts:75
- b7d4f741-61 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin-manifest.ts:158
- b7d4f741-62 - ignored - no-try-catch-in-effect-code - packages/sdk/app-framework/src/core/url-loader.ts:75
- b7d4f741-63 - ignored - error-messages-carry-context - packages/sdk/app-framework/src/core/url-loader.ts:202
- b7d4f741-64 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/url-loader.ts:335
- b7d4f741-65 - ignored - no-try-catch-in-effect-code - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:25
- b7d4f741-66 - ignored - workaround-is-documented-and-removable - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:96
- b7d4f741-67 - ignored - code-not-in-strings - packages/sdk/app-framework/src/vite-plugin/composer/index.ts:96
- b7d4f741-68 - ignored - change-behavior-inside-existing-api - packages/sdk/app-framework/src/vite-plugin/composer/load-with-vite.ts:15
- b7d4f741-69 - ignored - namespace-export-with-internal-hiding - packages/sdk/types/src/index.ts:1

## Issues

# WARN b7d4f741-1 one-changeset-per-pr `.changeset/echo-client-root-link-wait-close.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.96. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-2 import-as-namespace-is-all-or-nothing `packages/core/compute/edge-compute/src/plugin-loader/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-6 (`export * as PluginLoader from './PluginLoader.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-3 code-not-in-strings `packages/core/compute/edge-compute/src/plugin-loader/PluginLoader.test.ts:16`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.81. The likeliest place is lines 16-27 (`const bundle = (overrides: Record<string, string> = {}) =>`, location confidence 0.76). Judged with added `test` context after a first pass of 0.52. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-4 code-not-in-strings `packages/core/compute/edge-compute/src/plugin-loader/PluginLoader.ts:203`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.95. The likeliest place is lines 203-214 (`export const workerCode = async (files: Files): Promise<WorkerCode> => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-5 no-lint-suppression-to-pass `packages/core/compute/plugin-builder/src/bin/bundle-plugin.ts:1`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.85. The likeliest place is lines 1-12 (`import { resolve } from 'node:path';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-6 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/bundle-plugin.ts:18`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 18-27 (`const main = async () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-7 no-lint-suppression-to-pass `packages/core/compute/plugin-builder/src/bin/check-bundle.ts:1`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.83. The likeliest place is lines 1-12 (`#!/usr/bin/env node`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-8 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/check-bundle.ts:33`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 33-46 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-9 no-lint-suppression-to-pass `packages/core/compute/plugin-builder/src/bin/check-release.ts:1`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.80. The likeliest place is lines 1-12 (`#!/usr/bin/env node`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-10 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/check-release.ts:20`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 20-31 (`const main = async () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-11 namespace-export-with-internal-hiding `packages/core/compute/plugin-builder/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-9 (`export * from './build-bundle.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-12 code-not-in-strings `packages/core/compute/plugin-builder/src/load-bundle.ts:24`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.98. The likeliest place is lines 24-35 (`const IMPORT_MAIN = ``, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-13 no-try-catch-in-effect-code `packages/core/compute/plugin-builder/src/PluginBundle.ts:89`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 89-103 (`const parseJson = (files: Files, path: string, problems: Problem[]): unknown ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-14 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginCatalog.ts:43`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 43-57 (`const serializeOperations = (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-15 no-sleep-in-test `packages/core/echo/echo-client/src/client/echo-client.test.ts:24`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 24-33 (`await sleep(1);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-16 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/client/echo-client.ts:314`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 314-325 (`if (!db) {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-17 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:374`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 374-383 (`const unsubscribeFromClose = db.lifetimeEnded.on(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-18 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:226`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.85. The likeliest place is lines 226-249 (`#directory: { json: DirectoryJson; text: string } | undefined = undefined;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-19 comment-hygiene `packages/core/echo/echo-client/src/core-db/entity-manager.ts:250`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 250-273 (`private _objectsForNextDbUpdate = new Set<string>();`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-20 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:346`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 346-369 (`async open(ctx: Context): Promise<void> {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-21 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:418`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 418-441 (`try {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b7d4f741-22 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2770`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 2770-2793 (`const request = this._satisfactionRequests.get(objectId as EntityId);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-23 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:1043`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.85. The likeliest place is lines 1043-1090 (`for (const object of objects) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-24 no-retries-or-skips-for-flaky-tests `packages/core/mesh/edge-client/src/edge-http-client.test.ts:18`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.90. The likeliest place is lines 18-43 (`const DEV_SERVER = 'https://dev.dxos.network';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b7d4f741-25 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:583`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 583-609 (`const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b7d4f741-26 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:1145`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1145-1168 (`Effect.withSpan('EdgeHttpClient'),`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-27 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:1145`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 1145-1168 (`Effect.withSpan('EdgeHttpClient'),`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-28 namespace-export-with-internal-hiding `packages/core/protocols/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-14 (`export * from './automerge.ts';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-29 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/index.ts:19`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 19-26 (`export type * as ProcessProtocol from './ProcessProtocol.ts';`, location confidence 0.83). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# ERROR b7d4f741-30 no-casts `packages/devtools/cli/src/bin.ts:254`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 254-265 (`Command.runWith(command, CLI_CONFIG)(argv).pipe(Effect.provide(layer)) as Eff...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-31 flat-layer-composition `packages/devtools/cli/src/bin.ts:254`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 254-265 (`Command.runWith(command, CLI_CONFIG)(argv).pipe(Effect.provide(layer)) as Eff...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-32 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:254`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 254-265 (`Command.runWith(command, CLI_CONFIG)(argv).pipe(Effect.provide(layer)) as Eff...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-33 no-try-catch-in-effect-code `packages/devtools/cli/src/util/bundle-describer.ts:36`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 36-45 (`const checkoutEntry = (name: string): string | undefined => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-34 effect-fn-not-hand-wrapped-gen `packages/devtools/cli/src/util/bundle-describer.ts:66`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 66-77 (`export const bundleDescriberLayer = Layer.succeed(BundleDescriber.Service, {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-35 import-as-namespace-is-all-or-nothing `packages/devtools/cli/src/util/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-15 (`export * from './skills.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-36 no-retries-or-skips-for-flaky-tests `packages/e2e/composer-e2e/src/playwright/basic.spec.ts:121`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.92. The likeliest place is lines 121-132 (`'TODO(wittjosiah): This test seems to be flaky in firefox & webkit.',`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-37 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-cloudflare-os/dx.config.ts:42`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.84. The likeliest place is lines 42-53 (`),`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-38 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-cloudflare-os/src/agent/Projection.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-13 (`import { type ContentBlock } from '@dxos/types';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-39 use-context-scoped-cancellation `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 63-71 (`export const withDeadline = <T>(promise: PromiseLike<T>, timeoutMs: number): ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-40 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:63`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 63-71 (`export const withDeadline = <T>(promise: PromiseLike<T>, timeoutMs: number): ...`, location confidence 0.84). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-41 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-cloudflare-os/src/api/Client.ts:117`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 117-131 (`export const authenticate = ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-42 code-not-in-strings `packages/plugins/plugin-cloudflare-os/src/api/Sandbox.ts:33`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.93. The likeliest place is lines 33-40 (`const CAPNWEB_MODULE = `data:text/javascript;charset=utf-8;base64,${btoa(`//#...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-43 namespace-brand-key-prefixing `packages/plugins/plugin-cloudflare-os/src/constants.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 1-13 (`export const CLOUDFLARE_OS_CONNECTOR_ID = 'cloudflare-os';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b7d4f741-44 no-casts `packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-45 no-unused-new-api `packages/plugins/plugin-cloudflare-os/src/containers/index.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.85. The likeliest place is lines 1-8 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). Judged with added `diff, importers, public-api` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-46 reactive-state-via-atom-bridge `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:61`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 61-72 (`setError(undefined);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-47 use-context-scoped-cancellation `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/useWorkspace.ts:85`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 85-96 (`let reconnect: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-48 story-for-new-ui-component `packages/plugins/plugin-cloudflare-os/src/containers/WorkspaceArticle/WorkspaceArticle.tsx:26`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 26-37 (`export const WorkspaceArticle = ({ role, subject, attendableId }: WorkspaceAr...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-49 namespace-export-with-internal-hiding `packages/plugins/plugin-cloudflare-os/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-8 (`export * as CloudflareOsPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-50 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-cloudflare-os/src/operations/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as CloudflareOsOperationHandlerSet from './CloudflareOsOperationHand...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-51 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-cloudflare-os/src/types/CloudflareOs.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-52 no-lint-suppression-to-pass `packages/plugins/plugin-cloudflare-os/src/types/CloudflareOsOperation.ts:13`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.81. The likeliest place is lines 13-22 (`import { Connection } from '@dxos/link';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-53 barrel-imports-not-internal-paths `packages/plugins/plugin-registry/src/commands/registry/publish.ts:25`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 25-30 (`import * as BundleDescriber from '../../BundleDescriber.ts';`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-54 declare-optional-services-with-noop-layers `packages/plugins/plugin-registry/src/commands/registry/publish.ts:127`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 127-138 (`return yield* Effect.fail(new PublishError({ message: 'No dx.config.ts found....`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-55 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-registry/src/commands/registry/publish.ts:304`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 304-315 (`const readBundleFiles = (outdir: string) =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-56 namespace-export-with-internal-hiding `packages/plugins/plugin-registry/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-12 (`export * from './types/index.ts';`, location confidence 1.00). Judged with added `imports, public-api, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-57 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-registry/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`export * from './types/index.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-58 error-messages-carry-context `packages/plugins/plugin-registry/src/util/loader.ts:81`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 81-92 (`export const normalizePluginExport = (mod: Record<string, unknown>): Plugin.P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-59 effect-requirement-type-not-erased `packages/plugins/plugin-registry/src/util/resolve.ts:75`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 75-86 (`const resolveDirectory = (locator: string): Effect.Effect<Resolved, PluginIns...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-60 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-registry/src/util/resolve.ts:75`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 75-86 (`const resolveDirectory = (locator: string): Effect.Effect<Resolved, PluginIns...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-61 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin-manifest.ts:158`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 158-169 (`export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedMan...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-62 no-try-catch-in-effect-code `packages/sdk/app-framework/src/core/url-loader.ts:75`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 75-86 (`const getPersistedRemotePlugins = (storage: Storage, key: string): RemotePlug...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-63 error-messages-carry-context `packages/sdk/app-framework/src/core/url-loader.ts:202`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 202-214 (`if (typeof exported === 'object' && exported !== null && 'make' in exported &...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-64 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/url-loader.ts:335`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 335-346 (`export const preload = (options: PreloadOptions = {}): Effect.Effect<Plugin.P...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-65 no-try-catch-in-effect-code `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:25`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 25-39 (`const readPackageVersion = (dir: string): string => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-66 workaround-is-documented-and-removable `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:96`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.80. The likeliest place is lines 96-107 (`const REQUIRE_SHIM_BANNER = [`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-67 code-not-in-strings `packages/sdk/app-framework/src/vite-plugin/composer/index.ts:96`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.90. The likeliest place is lines 96-107 (`const REQUIRE_SHIM_BANNER = [`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-68 change-behavior-inside-existing-api `packages/sdk/app-framework/src/vite-plugin/composer/load-with-vite.ts:15`

System One judges this a likely violation of `change-behavior-inside-existing-api` (Put a fix or variant inside the existing API; don't grow a sibling, hybrid, or /lazy twin), p=0.81. The likeliest place is lines 15-21 (`export const loadDxConfigWithVite = async (filePath: string, root: string): P...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN b7d4f741-69 namespace-export-with-internal-hiding `packages/sdk/types/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.96. The likeliest place is lines 1-7 (`export * from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cab57d043d0ea366ce8855fe2f3906ad231cbdd1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 69 violations written to fragments, 617 uncertain, 3226 clean, 0 unanswered
- left for an agentic reviewer: 124 batch(es)

```text
requests: 1721 (395 verdicts re-asked with context the model requested)
estimated input tokens: 12192051
billed input tokens: 11676567 (cost $0.4904)
measured chars per token: 3.13
```
