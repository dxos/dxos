---
branch: dm/eager-meitner-21jiy5
commit: 24a3a63932c07f3ee4450da942bb44b06cd7b148
base: 341bb91bea2b43152acc9688ecaa64879138e035
mode: fast
createdAt: 2026-11-24T11:54:39.611Z
isFinalized: true
groups: 228
rules: [call-effect-api-not-promise-bridge, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, deprecated-tag-must-be-accurate, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, isolate-legacy-protocol-support, mutate-echo-arrays-with-splice, no-casts, no-env-vars-in-low-level-modules, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-retries-or-skips-for-flaky-tests, no-styling-wrapper-divs, no-try-catch-in-effect-code, options-object-with-defaults, store-events-not-projections, structured-logging-not-console, test-asserts-real-behavior, use-context-scoped-cancellation]
reviewId: 24a3a639
---

_5 error(s), 39 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 24a3a639-1 - ignored - no-casts - packages/core/compute/conductor/src/nodes/registry.ts:222
- 24a3a639-2 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/conductor/src/nodes/registry.ts:258
- 24a3a639-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/conductor/src/nodes/registry.ts:294
- 24a3a639-4 - ignored - error-messages-carry-context - packages/core/compute/conductor/src/nodes/registry.ts:366
- 24a3a639-5 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:79
- 24a3a639-6 - ignored - no-module-level-object-caches - packages/core/compute/sparql-sqlite/src/testing/w3c/harness.ts:134
- 24a3a639-7 - ignored - store-events-not-projections - packages/core/echo/echo-host/src/db-host/query-service.ts:98
- 24a3a639-8 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:321
- 24a3a639-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/query-service.ts:489
- 24a3a639-10 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/query-service.ts:525
- 24a3a639-11 - ignored - call-effect-api-not-promise-bridge - packages/core/echo/feed/src/testing/test-builder.ts:112
- 24a3a639-12 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- 24a3a639-13 - ignored - no-casts - packages/core/echo/feed/src/testing/test-builder.ts:175
- 24a3a639-14 - ignored - no-casts - packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86
- 24a3a639-15 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:151
- 24a3a639-16 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:598
- 24a3a639-17 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-github/src/walkthrough/plan.ts:104
- 24a3a639-18 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176
- 24a3a639-19 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296
- 24a3a639-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440
- 24a3a639-21 - ignored - test-asserts-real-behavior - packages/sdk/client-e2e/src/spaces.test.ts:161
- 24a3a639-22 - ignored - no-retries-or-skips-for-flaky-tests - packages/sdk/client-e2e/src/spaces.test.ts:161
- 24a3a639-23 - ignored - no-casts - packages/sdk/client-e2e/src/spaces.test.ts:281
- 24a3a639-24 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:88
- 24a3a639-25 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/devices/devices-service.ts:125
- 24a3a639-26 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- 24a3a639-27 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/devtools/devtools.ts:64
- 24a3a639-28 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- 24a3a639-29 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/devtools/devtools.ts:244
- 24a3a639-30 - ignored - deferred-callback-owns-its-context - packages/sdk/client-services/src/internal/identity/contacts-service.ts:41
- 24a3a639-31 - ignored - dont-leak-internal-api-through-public-surface - packages/sdk/client-services/src/internal/identity/identity-service.ts:43
- 24a3a639-32 - ignored - isolate-legacy-protocol-support - packages/sdk/client-services/src/internal/identity/inbox-service.ts:116
- 24a3a639-33 - ignored - dont-leak-internal-api-through-public-surface - packages/sdk/client-services/src/internal/identity/inbox-service.ts:138
- 24a3a639-34 - ignored - deferred-callback-owns-its-context - packages/sdk/client-services/src/internal/identity/inbox-service.ts:222
- 24a3a639-35 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:388
- 24a3a639-36 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/logging/logging-service.ts:33
- 24a3a639-37 - ignored - deprecated-tag-must-be-accurate - packages/sdk/client-services/src/internal/logging/logging-service.ts:69
- 24a3a639-38 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/logging/logging-service.ts:93
- 24a3a639-39 - ignored - options-object-with-defaults - packages/sdk/client-services/src/internal/logging/logging-service.ts:182
- 24a3a639-40 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/network/network-service.ts:152
- 24a3a639-41 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202
- 24a3a639-42 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:550
- 24a3a639-43 - ignored - use-context-scoped-cancellation - packages/sdk/client-services/src/internal/system/system-service.ts:153
- 24a3a639-44 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:564

## Issues

# ERROR 24a3a639-1 no-casts `packages/core/compute/conductor/src/nodes/registry.ts:222`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 222-233 (`items = Array.isArray(items) ? items : [items];`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-2 no-mixed-promise-effect-lifecycle `packages/core/compute/conductor/src/nodes/registry.ts:258`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 258-269 (`} else {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/conductor/src/nodes/registry.ts:294`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 294-305 (`'if': defineComputeNode({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-4 error-messages-carry-context `packages/core/compute/conductor/src/nodes/registry.ts:366`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 366-377 (`'database': defineComputeNode({`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-5 no-mixed-promise-effect-lifecycle `packages/core/compute/functions-runtime-cloudflare/src/internal/data-service-impl.ts:79`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 79-90 (`async refreshWorkingSet(): Promise<void> {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-6 no-module-level-object-caches `packages/core/compute/sparql-sqlite/src/testing/w3c/harness.ts:134`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 134-146 (`try {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-7 store-events-not-projections `packages/core/echo/echo-host/src/db-host/query-service.ts:98`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.81. The likeliest place is lines 98-109 (`type ActiveQuery = {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-8 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:321`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 321-332 (`async awaitQueryUpdates(): Promise<void> {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-9 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/query-service.ts:489`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 489-500 (`try {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-10 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/query-service.ts:525`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 525-536 (`}`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-11 call-effect-api-not-promise-bridge `packages/core/echo/feed/src/testing/test-builder.ts:112`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.81. The likeliest place is lines 112-123 (`#routeMessage(ctx: Context, msg: ProtocolMessage): Effect.Effect<void, unknow...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-12 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 24a3a639-13 no-casts `packages/core/echo/feed/src/testing/test-builder.ts:175`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 175-186 (`peerId: actorId,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 24a3a639-14 no-casts `packages/core/mesh/network-manager/src/transport/webrtc/rtc-service.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 86-97 (`remotePeerKey: request.remotePeerKey,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 24a3a639-15 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:151`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 151-177 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-16 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:598`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 598-621 (`}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-17 no-try-catch-in-effect-code `packages/plugins/plugin-github/src/walkthrough/plan.ts:104`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 104-115 (`try {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-18 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 176-199 (`(event) => event.operation.meta.key.toString() === ProjectOperation.DelegateT...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-19 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.89. The likeliest place is lines 296-319 (`const handleDeleteArtifact = useCallback(`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-20 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 440-463 (`)}`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-21 test-asserts-real-behavior `packages/sdk/client-e2e/src/spaces.test.ts:161`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.80. The likeliest place is lines 161-184 (`test.skip('creates a space on webfs', async () => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-22 no-retries-or-skips-for-flaky-tests `packages/sdk/client-e2e/src/spaces.test.ts:161`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.95. The likeliest place is lines 161-184 (`test.skip('creates a space on webfs', async () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 24a3a639-23 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:281`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 281-304 (`const feed1 = hypercoreStore1.getHypercore(feedKey!)!;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-24 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/agents/edge-agent-service.ts:88`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.93. The likeliest place is lines 88-101 (`export const EdgeAgentServiceLayer: Layer.Layer<`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-25 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/devices/devices-service.ts:125`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.90. The likeliest place is lines 125-134 (`export const DevicesServiceLayer = Layer.effect(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-26 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-27 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/devtools/devtools.ts:64`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 64-75 (`export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-28 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-29 error-messages-carry-context `packages/sdk/client-services/src/internal/devtools/devtools.ts:244`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 244-255 (`return Effect.promise(async () => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-30 deferred-callback-owns-its-context `packages/sdk/client-services/src/internal/identity/contacts-service.ts:41`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 41-52 (`const subscribedSpaceKeySet = new ComplexSet(PublicKey.hash);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-31 dont-leak-internal-api-through-public-surface `packages/sdk/client-services/src/internal/identity/identity-service.ts:43`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 43-54 (`export class IdentityServiceImpl extends Resource implements IdentityService....`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-32 isolate-legacy-protocol-support `packages/sdk/client-services/src/internal/identity/inbox-service.ts:116`

System One judges this a likely violation of `isolate-legacy-protocol-support` (Keep support for an old protocol version in self-contained, removable modules), p=0.81. The likeliest place is lines 116-127 (`const legacyInvitationMessage = async (notice: VerifiedSpaceInvitationNotice)...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-33 dont-leak-internal-api-through-public-surface `packages/sdk/client-services/src/internal/identity/inbox-service.ts:138`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.80. The likeliest place is lines 138-149 (`export class InboxServiceImpl implements InboxService.Handlers {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-34 deferred-callback-owns-its-context `packages/sdk/client-services/src/internal/identity/inbox-service.ts:222`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 222-233 (`#retain(): void {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-35 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:388`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.85. The likeliest place is lines 388-399 (`export const InboxServiceLayer = ({ relay }: InboxServiceLayerOptions = {}) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-36 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/logging/logging-service.ts:33`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 33-44 (`export class LoggingServiceImpl implements LoggingService.Handlers {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-37 deprecated-tag-must-be-accurate `packages/sdk/client-services/src/internal/logging/logging-service.ts:69`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.83. The likeliest place is lines 69-80 (`['LoggingService.queryMetrics']({`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-38 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/logging/logging-service.ts:93`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 93-104 (`update();`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-39 options-object-with-defaults `packages/sdk/client-services/src/internal/logging/logging-service.ts:182`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.80. The likeliest place is lines 182-193 (`const shouldLog = (entry: NaturalLogEntry, request: QueryLogsRequest): boolea...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-40 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/network/network-service.ts:152`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.91. The likeliest place is lines 152-165 (`export const NetworkServiceLayer: Layer.Layer<`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-41 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.92. The likeliest place is lines 202-213 (`async () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-42 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:550`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 550-561 (`private async _populateImportedSpace(ctx: Context, space: DataSpace, populate...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-43 use-context-scoped-cancellation `packages/sdk/client-services/src/internal/system/system-service.ts:153`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 153-164 (`['SystemService.queryStatus']({ interval = 3_000 }: SystemService.QueryStatus...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 24a3a639-44 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:564`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 564-591 (`const GeneratorWarning = ({ status }: { status: Extract<EffectStatus, { state...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `341bb91bea2b43152acc9688ecaa64879138e035`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 44 violations written to fragments, 359 uncertain, 1383 clean, 0 unanswered
- left for an agentic reviewer: 108 batch(es)

```text
requests: 769 (152 verdicts re-asked with context the model requested)
estimated input tokens: 8120140
billed input tokens: 7922768 (cost $0.3328)
measured chars per token: 3.07
```
