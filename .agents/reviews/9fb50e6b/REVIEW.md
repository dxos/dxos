---
branch: dm/wizardly-cray-ym6cp4
commit: 9fb50e6bab964753a3e130e5d9cf63d15878152e
base: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
mode: fast
createdAt: 2026-10-27T09:57:39.142Z
isFinalized: true
groups: 109
rules: [declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, dont-leak-internal-api-through-public-surface, error-messages-carry-context, flat-layer-composition, log-fire-and-forget-rejections, no-casts, no-env-vars-in-low-level-modules, no-sleep-in-test, no-try-catch-in-effect-code, retries-via-schedule-with-evidence, schema-declare-and-brand, write-through-the-live-object]
reviewId: 9fb50e6b
---

_4 error(s), 18 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9fb50e6b-1 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:314
- 9fb50e6b-2 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/echo-host.ts:650
- 9fb50e6b-3 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:616
- 9fb50e6b-4 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:1120
- 9fb50e6b-5 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-space/src/containers/SpaceSettingsContainer/SpaceSettingsContainer.tsx:177
- 9fb50e6b-6 - ignored - write-through-the-live-object - packages/plugins/plugin-space/src/containers/SpaceSettingsContainer/SpaceSettingsContainer.tsx:177
- 9fb50e6b-7 - ignored - dont-leak-internal-api-through-public-surface - packages/sdk/client-protocol/src/space.ts:189
- 9fb50e6b-8 - ignored - schema-declare-and-brand - packages/sdk/client-protocol/src/space.ts:189
- 9fb50e6b-9 - resolved - no-sleep-in-test - packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:338
- 9fb50e6b-10 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:482
- 9fb50e6b-11 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:322
- 9fb50e6b-12 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:394
- 9fb50e6b-13 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:730
- 9fb50e6b-14 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1296
- 9fb50e6b-15 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202
- 9fb50e6b-16 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:550
- 9fb50e6b-17 - ignored - no-casts - packages/sdk/client/src/echo/space-proxy.ts:159
- 9fb50e6b-18 - ignored - no-try-catch-in-effect-code - packages/sdk/client/src/echo/space-proxy.ts:447
- 9fb50e6b-19 - ignored - retries-via-schedule-with-evidence - packages/sdk/client/src/echo/space-proxy.ts:447
- 9fb50e6b-20 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/echo/space-proxy.ts:519
- 9fb50e6b-21 - ignored - log-fire-and-forget-rejections - packages/sdk/client/src/echo/space-proxy.ts:639
- 9fb50e6b-22 - ignored - error-messages-carry-context - packages/sdk/client/src/echo/space-proxy.ts:855

## Issues

# WARN 9fb50e6b-1 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:314`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 314-337 (`isBranchDocument: (documentId) => this._spaceStateManager.isBranchDocument(do...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-2 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/echo-host.ts:650`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 650-673 (`if (batch) {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9fb50e6b-3 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:616`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 616-639 (`body: data as BodyInit,`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-4 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:1120`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 1120-1143 (`public async _fetch<T>(url: URL, _args: { method: string }): Promise<T> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-5 no-try-catch-in-effect-code `packages/plugins/plugin-space/src/containers/SpaceSettingsContainer/SpaceSettingsContainer.tsx:177`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 177-188 (`setSpaceRootUrl(await space.internal.migrateSpaceRoot());`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-6 write-through-the-live-object `packages/plugins/plugin-space/src/containers/SpaceSettingsContainer/SpaceSettingsContainer.tsx:177`

System One judges this a likely violation of `write-through-the-live-object` (Writes target the live object or the atom setter, never a snapshot), p=0.82. The likeliest place is lines 177-188 (`setSpaceRootUrl(await space.internal.migrateSpaceRoot());`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-7 dont-leak-internal-api-through-public-surface `packages/sdk/client-protocol/src/space.ts:189`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.85. The likeliest place is lines 189-193 (`export const SpaceSchema: Schema.Codec<Space> = Schema.Any.pipe(`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-8 schema-declare-and-brand `packages/sdk/client-protocol/src/space.ts:189`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.95. The likeliest place is lines 189-193 (`export const SpaceSchema: Schema.Codec<Space> = Schema.Any.pipe(`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-9 no-sleep-in-test `packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:338`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 338-361 (`test('a member adopts the root edge holds when it reopens the space', async (...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9fb50e6b-10 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:482`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 482-505 (`handle!.change((doc: CredentialsDocument) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-11 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:322`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 322-345 (`log.error('Error loading space', { spaceMetadata, err });`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9fb50e6b-12 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:394`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 394-417 (`'Invalid document IDs',`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-13 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:730`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.85. The likeliest place is lines 730-753 (`}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-14 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1296`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 1296-1319 (`invitationsManager,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-15 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:202`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.92. The likeliest place is lines 202-213 (`async () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-16 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:550`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 550-561 (`private async '_populateImportedSpace'(ctx: Context, space: DataSpace, popula...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9fb50e6b-17 no-casts `packages/sdk/client/src/echo/space-proxy.ts:159`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 159-182 (`private readonly _db!: DatabaseImpl;`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-18 no-try-catch-in-effect-code `packages/sdk/client/src/echo/space-proxy.ts:447`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 447-470 (`log('initializing...', { space: this.key });`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-19 retries-via-schedule-with-evidence `packages/sdk/client/src/echo/space-proxy.ts:447`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.88. The likeliest place is lines 447-470 (`log('initializing...', { space: this.key });`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-20 deferred-callback-owns-its-context `packages/sdk/client/src/echo/space-proxy.ts:519`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.86. The likeliest place is lines 519-542 (`scheduleMicroTask(this._ctx, () => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-21 log-fire-and-forget-rejections `packages/sdk/client/src/echo/space-proxy.ts:639`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.90. The likeliest place is lines 639-662 (`listen(channel: string, callback: (message: GossipMessage) => void): ListenHa...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9fb50e6b-22 error-messages-carry-context `packages/sdk/client/src/echo/space-proxy.ts:855`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 855-878 (`return await new Promise<void>((resolve, reject) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `04d5fb15a8b5e81ebbabcfc78abdadb969765750`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 22 violations written to fragments, 384 uncertain, 174 clean, 0 unanswered
- left for an agentic reviewer: 87 batch(es)

```text
requests: 435 (209 verdicts re-asked with context the model requested)
estimated input tokens: 6668775
billed input tokens: 6750177 (cost $0.2835)
measured chars per token: 2.96
```
