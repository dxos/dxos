---
branch: dm/wizardly-cray-ym6cp4
commit: 760c8d7592719875c79feb78272d17666dc72d0e
base: 691fe848346e681c85e03fe07886eb2673904464
mode: fast
createdAt: 2026-10-29T12:46:54.569Z
isFinalized: true
groups: 99
rules: [business-logic-out-of-ui, declare-optional-services-with-noop-layers, deferred-callback-owns-its-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, log-fire-and-forget-rejections, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, prefer-branded-types-over-raw-primitives, reactive-state-via-atom-bridge, retries-via-schedule-with-evidence, reuse-shared-test-layer, write-through-the-live-object]
reviewId: 760c8d75
---

_5 error(s), 21 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 760c8d75-1 - ignored - write-through-the-live-object - packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:124
- 760c8d75-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:124
- 760c8d75-3 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:124
- 760c8d75-4 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:136
- 760c8d75-5 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:136
- 760c8d75-6 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/EdgeSpaceRoot.ts:36
- 760c8d75-7 - ignored - reuse-shared-test-layer - packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:126
- 760c8d75-8 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:198
- 760c8d75-9 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:330
- 760c8d75-10 - ignored - prefer-branded-types-over-raw-primitives - packages/sdk/client-services/src/internal/identity/identity-manager.ts:97
- 760c8d75-11 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/identity/identity-manager.ts:141
- 760c8d75-12 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/identity/identity-manager.ts:237
- 760c8d75-13 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/identity/identity-manager.ts:237
- 760c8d75-14 - ignored - no-casts - packages/sdk/client-services/src/internal/identity/identity-manager.ts:477
- 760c8d75-15 - ignored - log-fire-and-forget-rejections - packages/sdk/client-services/src/internal/identity/identity-manager.ts:597
- 760c8d75-16 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/identity-manager.ts:760
- 760c8d75-17 - ignored - event-handler-naming-convention - packages/sdk/client-services/src/internal/identity/identity-service.ts:43
- 760c8d75-18 - resolved - no-sleep-in-test - packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:170
- 760c8d75-19 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:626
- 760c8d75-20 - ignored - no-try-catch-in-effect-code - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:317
- 760c8d75-21 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:413
- 760c8d75-22 - ignored - retries-via-schedule-with-evidence - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:773
- 760c8d75-23 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1297
- 760c8d75-24 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/halo/halo-proxy.ts:320
- 760c8d75-25 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:428
- 760c8d75-26 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client/src/halo/halo-proxy.ts:440

## Issues

# WARN 760c8d75-1 write-through-the-live-object `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:124`

System One judges this a likely violation of `write-through-the-live-object` (Writes target the live object or the atom setter, never a snapshot), p=0.81. The likeliest place is lines 124-135 (`void updateProfile(profile, identity?.data);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 124-135 (`void updateProfile(profile, identity?.data);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-3 reactive-state-via-atom-bridge `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:124`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 124-135 (`void updateProfile(profile, identity?.data);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-4 no-try-catch-in-effect-code `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:136`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 136-147 (`const [migrating, setMigrating] = useState(false);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-5 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/ProfileContainer/ProfileContainer.tsx:136`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 136-147 (`const [migrating, setMigrating] = useState(false);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-6 no-try-catch-in-effect-code `packages/sdk/client-services/src/EdgeSpaceRoot.ts:36`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 36-48 (`return { kind: 'none' };`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-7 reuse-shared-test-layer `packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:126`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 126-137 (`const setupHaloWithEdgeRoot = async () => {`, location confidence 0.34). Judged with added `siblings, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-8 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:198`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.80. The likeliest place is lines 198-209 (`test('migrating on edge retries until edge can anchor, then adopts its root',...`, location confidence 0.90). Judged with added `test` context after a first pass of 0.22. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 760c8d75-9 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.test.ts:330`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 330-339 (`const deviceProfile = identity.authorizedDeviceKeys.get(identity.deviceKey);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-10 prefer-branded-types-over-raw-primitives `packages/sdk/client-services/src/internal/identity/identity-manager.ts:97`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.81. The likeliest place is lines 97-113 (`haloSpaceRootUrl?: string;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-11 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/identity/identity-manager.ts:141`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 141-164 (`export class IdentityManager {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-12 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/identity/identity-manager.ts:237`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 237-260 (`const { rootDocumentUrl } = await edgeHttpClient.migrateSpaceRoot(ctx, spaceId);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-13 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/identity/identity-manager.ts:237`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.87. The likeliest place is lines 237-260 (`const { rootDocumentUrl } = await edgeHttpClient.migrateSpaceRoot(ctx, spaceId);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 760c8d75-14 no-casts `packages/sdk/client-services/src/internal/identity/identity-manager.ts:477`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 477-500 (`await this._identity.ready();`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-15 log-fire-and-forget-rejections `packages/sdk/client-services/src/internal/identity/identity-manager.ts:597`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.90. The likeliest place is lines 597-620 (`return identity;`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-16 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/identity-manager.ts:760`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 760-784 (`const hypercoreStore = yield* HypercoreStoreService;`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-17 event-handler-naming-convention `packages/sdk/client-services/src/internal/identity/identity-service.ts:43`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 43-54 (`export class IdentityServiceImpl extends Resource implements IdentityService....`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-18 no-sleep-in-test `packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:170`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 170-193 (`await getFirstSpace(peer).activate(new Context());`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 760c8d75-19 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:626`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 626-649 (`expect(replayedInvitee![1].role).to.equal(SpaceMember_Role.EDITOR);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-20 no-try-catch-in-effect-code `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:317`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 317-340 (`try {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 760c8d75-21 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:413`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 413-436 (`preserveHistory: true,`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-22 retries-via-schedule-with-evidence `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:773`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.86. The likeliest place is lines 773-796 (`delay = EDGE_MIGRATION_RETRY_INITIAL;`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-23 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/spaces/data-space-manager.ts:1297`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 1297-1320 (`| InvitationsContract.ManagerService`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-24 deferred-callback-owns-its-context `packages/sdk/client/src/halo/halo-proxy.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 320-331 (`async createIdentity(`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 760c8d75-25 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 428-439 (`if (!this.opened) {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 760c8d75-26 no-mixed-promise-effect-lifecycle `packages/sdk/client/src/halo/halo-proxy.ts:440`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 440-451 (`join(invitation: Invitation | string, deviceProfile?: DeviceProfileDocument) {`, location confidence 0.11). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `691fe848346e681c85e03fe07886eb2673904464`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 26 violations written to fragments, 364 uncertain, 253 clean, 0 unanswered
- left for an agentic reviewer: 79 batch(es)

```text
requests: 432 (203 verdicts re-asked with context the model requested)
estimated input tokens: 5305338
billed input tokens: 5250888 (cost $0.2205)
measured chars per token: 3.03
```
