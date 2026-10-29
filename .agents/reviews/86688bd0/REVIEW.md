---
branch: dm/wizardly-cray-ym6cp4
commit: 86688bd05c803d9ec322ca7ae7331713d0f0bc34
base: 691fe848346e681c85e03fe07886eb2673904464
mode: fast
createdAt: 2026-10-29T12:19:21.687Z
isFinalized: true
groups: 98
rules: [business-logic-out-of-ui, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, prefer-branded-types-over-raw-primitives, retries-via-schedule-with-evidence, reuse-shared-test-layer]
reviewId: 86688bd0
---

_5 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 86688bd0-1 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:135
- 86688bd0-2 - ignored - reuse-shared-test-layer - packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:150
- 86688bd0-3 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:210
- 86688bd0-4 - ignored - prefer-branded-types-over-raw-primitives - packages/sdk/client-services/src/internal/identity/identity-manager.ts:96
- 86688bd0-5 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/identity/identity-manager.ts:236
- 86688bd0-6 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/identity/identity-manager.ts:236
- 86688bd0-7 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:476
- 86688bd0-8 - ignored - log-fire-and-forget-rejections - packages/sdk/client-services/src/internal/identity/identity-manager.ts:596
- 86688bd0-9 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:757
- 86688bd0-10 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:290
- 86688bd0-11 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:316
- 86688bd0-12 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:412
- 86688bd0-13 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:748
- 86688bd0-14 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1319
- 86688bd0-15 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/halo/halo-proxy.ts:320
- 86688bd0-16 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:428
- 86688bd0-17 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client/src/halo/halo-proxy.ts:440

## Issues

# WARN 86688bd0-1 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:135`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 135-146 (`setHaloSpaceRootUrl(await client.halo.migrateIdentityRoot());`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the button calls one client API and shows a toast, the same shape as the space settings Migrate row merged in #14254.

# WARN 86688bd0-2 reuse-shared-test-layer `packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:150`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.82. The likeliest place is lines 150-161 (`migrateSpaceRoot: async () => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the fake EDGE client mirrors the one `setupLegacySpaceWithEdge` already uses; TestBuilder is the shared harness.

# ERROR 86688bd0-3 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 210-221 (`expect(peer2.identityManager.identity!.deviceKey).to.deep.eq(identity1.device...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing; this PR adds no casts or non-null assertions (audited the diff's added lines).

# WARN 86688bd0-4 prefer-branded-types-over-raw-primitives `packages/sdk/client-services/src/internal/identity/identity-manager.ts:96`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.83. The likeliest place is lines 96-112 (`haloSpaceRootUrl?: string;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing field, not changed here.

# WARN 86688bd0-5 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/identity/identity-manager.ts:236`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 236-259 (`const { rootDocumentUrl } = await edgeHttpClient.migrateSpaceRoot(ctx, spaceId);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

Ignored: these classes are promise-based throughout; converting them to Effect is out of scope.

# WARN 86688bd0-6 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/identity/identity-manager.ts:236`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 236-259 (`const { rootDocumentUrl } = await edgeHttpClient.migrateSpaceRoot(ctx, spaceId);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

Ignored: matches the existing data-space retry loop; EDGE's typed 'pending' answer is the evidence the failure is transient.

# ERROR 86688bd0-7 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:476`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 476-499 (`await this._identity.ready();`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing; this PR adds no casts or non-null assertions (audited the diff's added lines).

# WARN 86688bd0-8 log-fire-and-forget-rejections `packages/sdk/client-services/src/internal/identity/identity-manager.ts:596`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.91. The likeliest place is lines 596-619 (`return identity;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing code, not changed here.

# WARN 86688bd0-9 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:757`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 757-780 (`export const IdentityManagerLayer = (`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

Ignored: matches the existing `Effect.serviceOption` wiring in these layers.

# ERROR 86688bd0-10 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:290`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 290-313 (`const setupLegacySpaceWithEdge = async () => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing; this PR adds no casts or non-null assertions (audited the diff's added lines).

# WARN 86688bd0-11 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:316`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 316-339 (`try {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

Ignored: these classes are promise-based throughout; converting them to Effect is out of scope.

# ERROR 86688bd0-12 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:412`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 412-435 (`preserveHistory: true,`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing; this PR adds no casts or non-null assertions (audited the diff's added lines).

# WARN 86688bd0-13 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:748`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 748-771 (`async migrateSpaceRootOnEdge(ctx: Context, spaceKey: PublicKey): Promise<Auto...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

Ignored: matches the existing data-space retry loop; EDGE's typed 'pending' answer is the evidence the failure is transient.

# WARN 86688bd0-14 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1319`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 1319-1342 (`const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

Ignored: matches the existing `Effect.serviceOption` wiring in these layers.

# WARN 86688bd0-15 deferred-callback-owns-its-context `packages/sdk/client/src/halo/halo-proxy.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 320-331 (`async createIdentity(`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

Ignored: follows the existing HaloProxy subscription pattern.

# ERROR 86688bd0-16 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 428-439 (`if (!this.opened) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

Ignored: pre-existing; this PR adds no casts or non-null assertions (audited the diff's added lines).

# WARN 86688bd0-17 no-mixed-promise-effect-lifecycle `packages/sdk/client/src/halo/halo-proxy.ts:440`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 440-451 (`join(invitation: Invitation | string, deviceProfile?: DeviceProfileDocument) {`, location confidence 0.12). This is a single-shot classifier: confirm against the rule before acting.

Ignored: HaloProxy's lifecycle is promise-based throughout; out of scope.

## Appendix

### System One pass

- model: jev-latest
- base for context: `691fe848346e681c85e03fe07886eb2673904464`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 17 violations written to fragments, 361 uncertain, 221 clean, 0 unanswered
- left for an agentic reviewer: 81 batch(es)

```text
requests: 405 (196 verdicts re-asked with context the model requested)
estimated input tokens: 4983791
billed input tokens: 4943796 (cost $0.2076)
measured chars per token: 3.02
```
