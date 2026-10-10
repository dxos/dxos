---
branch: claude/notifications-panel-messenger-43e84f
commit: ddab43430d230f8bd5d226d58bff751c8f5e7237
base: de6304c4f67dfab3ad78dd784fd94fc26e87e505
mode: fast
createdAt: 2026-10-05T15:52:56.008Z
isFinalized: true
groups: 197
rules: [bounded-live-state, comment-hygiene, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-sleep-in-test, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: ddab43430d2
---

_3 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ddab43430d2-1 - resolved - structured-logging-not-console - packages/e2e/composer-e2e/src/playwright/messenger-demo.spec.ts:98
- ddab43430d2-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/app-graph-builder.ts:109
- ddab43430d2-3 - ignored - no-casts - packages/plugins/plugin-client/src/containers/index.ts:1
- ddab43430d2-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-messenger/src/stories/Messenger.stories.tsx:90
- ddab43430d2-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:292
- ddab43430d2-6 - resolved - no-sleep-in-test - packages/sdk/client-services/src/internal/identity/inbox-service.test.ts:254
- ddab43430d2-7 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/identity/inbox-service.ts:388
- ddab43430d2-8 - ignored - bounded-live-state - packages/sdk/client-services/src/internal/testing/memory-edge-inbox.ts:27
- ddab43430d2-9 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/memory-edge-inbox.ts:39
- ddab43430d2-10 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:413
- ddab43430d2-11 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- ddab43430d2-12 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:213

## Issues

# WARN ddab43430d2-1 structured-logging-not-console `packages/e2e/composer-e2e/src/playwright/messenger-demo.spec.ts:98`

Resolved: the demo's step banner and trigger prompt now use `log.info` with structured context; the file no longer mixes `console` and `@dxos/log`.

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 98-109 (`const waitForDemoTrigger = async (): Promise<void> => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/app-graph-builder.ts:109`

Ignored: `accountAccount` at line 109 is unchanged; this PR only deleted the `accountSpaceInvitations` extension and badge code and added a `testId`.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 109-120 (`connector: (_node, get) =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ddab43430d2-3 no-casts `packages/plugins/plugin-client/src/containers/index.ts:1`

Ignored: the PR's only entry, `SpaceInvitationContainer`, is typed `LazyExoticComponent<ComponentType<SpaceInvitationContainerProps>>` (fixed in de6304c4f67-2); sibling `ComponentType<any>` entries are pre-existing.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 1-30 (`import { type ComponentType, type LazyExoticComponent, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-messenger/src/stories/Messenger.stories.tsx:90`

Ignored: the `options` `useMemo` maps contacts to Select items for one story column — a one-off derivation the rule exempts, not a filter/query or resource lifecycle.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 90-101 (`const options = useMemo(`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-5 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:292`

Ignored: `InvitationQR` at line 292 is pre-existing; this PR only added the not-notified toast in `MembersContainer`'s add-members handler.

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 292-303 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-6 no-sleep-in-test `packages/sdk/client-services/src/internal/identity/inbox-service.test.ts:254`

Resolved: the `setTimeout` sleep is gone; the test waits on `MemoryEdgeInbox.listCalls` for each refused pull and asserts the single `account-required` snapshot after the serialized pull that turns `available`.

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 254-265 (`const refused = () => snapshots.filter((snapshot) => snapshot.status === 'acc...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-7 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/identity/inbox-service.ts:388`

Ignored: the `Effect.serviceOption` reads are pre-existing (on main); the new `relay` option is a host-parameterised strategy object (`InboxRelay.connect`), which the rule exempts (as de6304c4f67-19).

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 388-399 (`export const InboxServiceLayer = ({ relay }: InboxServiceLayerOptions = {}) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ddab43430d2-8 bounded-live-state `packages/sdk/client-services/src/internal/testing/memory-edge-inbox.ts:27`

Ignored: `MemoryEdgeInbox` is an in-memory test/story double whose lifetime is one test or story, not long-lived or persisted state; `#devices` entries are removed by the unsubscribe that adds them.

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 27-38 (`export class MemoryEdgeInbox implements InboxRelay {`, location confidence 0.76). Judged with added `diff, importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-9 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/memory-edge-inbox.ts:39`

Ignored: `'Not authenticated: no identity.'` fires when there is no identity at all, so there is no id to carry; the account refusal beside it is already a structured `EdgeCallFailedError`.

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 39-50 (`void this.#ring(recipientDid);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ddab43430d2-10 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:413`

Ignored: `this._invitationProxy!` in `share()` is pre-existing; the PR's inbox rename/status hunks add no cast (as de6304c4f67-21).

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 413-424 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-11 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

Ignored: the flagged `// Is this required?` comment is pre-existing and outside the diff (as de6304c4f67-24).

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 44-55 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddab43430d2-12 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:213`

Ignored: the unmount `useEffect` at line 213 is pre-existing; this PR only added `data-testid='toast.close'` to the close trigger.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 213-224 (`() => () => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `de6304c4f67dfab3ad78dd784fd94fc26e87e505`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 12 violations written to fragments, 289 uncertain, 1469 clean, 0 unanswered
- left for an agentic reviewer: 73 batch(es)

```text
requests: 766 (190 verdicts re-asked with context the model requested)
estimated input tokens: 5201540
billed input tokens: 4877280 (cost $0.2048)
measured chars per token: 3.20
```
