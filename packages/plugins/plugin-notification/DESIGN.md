# Declarative Notifications — Design

Status: proposal (considered). Decides *what* triggers a notification and *who* gets it. The Edge
delivery layer (`notification-service`: device subscriptions, transports, fan-out, dedupe) and the
client device-registration layer (service-worker push listeners + `pushManager.subscribe` +
`registerPushSubscription`) are already built and unchanged. This document covers the
**producer/preferences layer**.

## Core principle: notifications are personal preferences

Whether *you* get notified about an event is *your* decision, configured by *you*. So the
configuration is **personal**, stored as data in **your personal space**, and scoped to you.

- A single event (e.g. a new message in a channel) may notify many people, but **each recipient is
  there because their own personal rule matched** — not because the event named them.
- Therefore the recipient question inverts and simplifies: *"who gets notified for event E in space
  X?"* = **the members of X whose personal rules match E and whose scope includes X.** There is no
  rule-authored recipient list and no server-side "audience resolver."

This is why it does **not** map cleanly onto function triggers: triggers are **space-local** (scoped
to one space's ECHO db) and **recipient-agnostic** (they invoke a function). Personal notification
rules are **cross-space** and **self-addressed** (the recipient is always the rule's owner). We reuse
the *matching* and *delivery* machinery, but the rules live in the personal space and are evaluated
per-identity, not written into shared spaces (which would also leak your preferences to others).

## Verified facts this design relies on

1. **The personal space replicates to Edge.** It is a normal ECHO space tagged
   `PERSONAL_SPACE_TAG = 'org.dxos.space.personal'` (currently in
   `packages/sdk/app-toolkit/src/personal-space.ts`); identity creation sets
   `personalSpace.internal.setEdgeReplicationPreference(ENABLED)`
   (`packages/plugins/plugin-space/src/capabilities/identity-created.ts:28`). Edge indexes/queries it
   like any space via `DataService.execQuery` → Indexer2 (`db-service/.../entrypoint/data-service.ts`).
   It is **not** HALO (the keyring space). ⇒ Edge can read your `NotificationRule` objects server-side.
   **Refactor required:** Edge cannot depend on the client `@dxos/app-toolkit` package, so
   `PERSONAL_SPACE_TAG` (and `isPersonalSpace`) must be **factored out into `@dxos/echo-protocol`** so
   both the client and Edge can reference the constant.
2. **Edge can map identity → spaces.** The per-identity **Agent DO** stores feed keys per space and
   exposes `listSpaceIds()` (`packages/services/agents/src/agent/agent.ts:107`), surfaced via
   admin `resolveIdentitySpaces` (`edge-protocol/.../admin-service.ts`). ⇒ Edge can enumerate your
   in-scope spaces.
3. **The per-space dispatcher is single-space + recipient-agnostic.** `TriggerLoader._queryTriggers`
   is hard-scoped to `Scope.space(this._spaceId)` (`functions-service/.../trigger-loader.ts:179`); one
   `TriggersDispatcher` DO per space. ⇒ cross-space, self-addressed personal rules need a new
   per-identity evaluator (the Agent DO is the natural host — it already has the identity, its space
   list, and read access to the personal space).

## The model: `NotificationRule` (in `@dxos/types`, stored in the personal space)

```ts
// packages/sdk/types/src/types/NotificationRule.ts
export const NotificationRule = Schema.Struct({
  name: Schema.optional(Schema.String),
  enabled: Schema.optional(Schema.Boolean),

  // WHAT to match — reuse the trigger spec *shapes* (subscription | feed). See "spec reuse".
  // - subscription: a new/changed object matching a query (e.g. a Message in a thread, any type).
  // - feed:         a new item appended to a feed (e.g. a channel message). Matched by typename.
  when: WhenSpec,                       // { kind:'subscription', query } | { kind:'feed', typename }
  match: Schema.optional(Schema.Struct({
    typename: Schema.optional(Schema.String),                 // narrow within the feed/query
    where: Schema.optional(Schema.Array(Predicate)),          // [{ path, op, value }] (typename-first; full AST later)
  })),

  // SCOPE — which of *my* spaces this rule applies to. Self-addressed: recipient is always the owner.
  scope: Schema.optional(Schema.Struct({
    mode: Schema.optional(Schema.Literal('all', 'only')),     // default 'all'
    only: Schema.optional(Schema.Array(Schema.String)),       // allow-list (mode='only')
    except: Schema.optional(Schema.Array(Schema.String)),     // deny-list (mode='all')
  })),

  // Behaviour.
  notify: Schema.optional(Schema.Struct({
    topic: Schema.optional(Schema.String),                    // grouping label, e.g. 'channel.message'
    excludeOwnActions: Schema.optional(Schema.Boolean),       // default true — don't notify on events you caused
    throttle: Schema.optional(Schema.String),                 // '30s' → collapse bursts ("3 new messages")
    // Optional presentation override; otherwise a per-typename default template renders title/body.
    template: Schema.optional(TemplateSpec),
  })),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.notification-rule', '0.1.0')));
// Visible (not HiddenAnnotation) — these are user-managed in the notifications UI.
```

Notes:
- **Recipient is implicit** (the owner of the personal space the rule lives in). No `audience` field.
- **Identities are represented as DID** throughout this layer (decided). Owners/recipients are DIDs;
  the message sender is already a DID (`message.sender.identityDid`); space members enumerated as hex
  (`getSpaceMembers`) are converted hex → DID at the boundary. `excludeOwnActions` compares DIDs.
- **`template`** is mostly optional: the server can render a sensible default per matched typename
  (e.g. Message → `{sender.name}: {text}`); rules may override. For OS notifications (app closed) the
  rendered string is what shows; a focused client can still enrich/localize from `data`.
- **Spec reuse (decided): reuse, if it makes sense.** `when` reuses the trigger `Spec` shapes
  (`subscription` carries `query.ast: QueryAST.Query`; `feed`) from `@dxos/compute` rather than mirroring
  — accept the `@dxos/types → @dxos/compute` dependency if it's clean; only mirror if that dependency
  proves problematic. The point is to share one query/match representation with subscription triggers.
- **Match depth (decided):** support whatever **subscription triggers** support, converging on the
  **full query AST** (not typename-only). Practically: ride the current subscription matching (typename
  today) and inherit the full-AST evaluation as the trigger system gains it, since we reuse its query
  representation and the `QueryExecutor`.

## Implementation status (Phase 2)

Built (compiles end-to-end; not yet runtime-validated):
- **Rules are materialized into D1** (`RuleIndex` table, keyed by `spaceId`). The per-identity
  `NotificationIndexer` DO compiles a user's personal `NotificationRule` objects into one row per
  (rule × in-scope space) on `reindex`, which the client triggers via `POST /notifications/reindex`
  after editing rules (auto-trigger on rule-object change is Phase 4).
- **Feed events do a fast per-space lookup**: `FeedSpace.insertObjects` → `onFeedItems` →
  `RuleIndex WHERE spaceId` → evaluate (`rules.ts`) → `publish` to matching owners. No per-event
  ECHO query or member enumeration.
- **Delivery dedupe is KV** (TTL), not a D1 table. D1 now holds only device `Subscription`s and the
  `RuleIndex`. Per-account muting is just the presence/absence of personal rules (no `TopicPreference`).

## Edge architecture: per-identity indexer + reused per-space matching

```
Personal space (ECHO)                         NotificationIndexer DO  (per identity, NEW)
  NotificationRule objects  ──replicate──▶     • membership via Agent DO listSpaceIds()
        ▲ user edits in UI                      • reads personal-space rules (DataService/Indexer2)
        │                                        • watches rules + membership for changes
        │                                        • compiles, per in-scope space, a set of
        │                                          { ownerDid, matcher, template, policy }
        │                                                     │  maintains
        ▼                                                     ▼
  plugin-notifications (UI)                      Notification index  (per spaceId → matchers[])
                                                              ▲ consulted on each event
event in space X ─▶ existing signals ────────────────────────┘
  • FeedSpace.insertObjects → _notifyFeedItemsInserted (feed)
  • onObjectsChanged (subscription)
                              │ for each matcher whose match fires & owner≠actor & scope∋X
                              ▼
                       publish(env, { recipients:[ownerDid], notification })  ──▶ devices
```

- **Source of truth**: rules in the personal space (replicated). A **dedicated per-identity
  `NotificationIndexer` DO** (keyed by identity DID; uses the Agent DO's `listSpaceIds()` for
  membership) reads them and **compiles per-space matcher sets** tagged with the owner DID. Compiled
  matchers are **Edge-internal** — never written into shared spaces.
- **Evaluation (decided): a sibling matcher pass owned by the `NotificationIndexer`**, not injected
  into the function-`TriggersDispatcher` — keeps notifications decoupled from function-trigger code
  while reusing the matching primitives + `QueryExecutor`. When an event fires in space X (the existing
  feed/object signals), evaluate X's compiled matcher set; each match → `publish` to its owner DID.
  Delivery reuses Workstream A.

## Bookkeeping (what keeps the index correct)
The per-identity indexer recompiles a user's contribution to the per-space index when:
- the user's `NotificationRule` objects change (watch the personal space),
- the user joins/leaves a space (`listSpaceIds` delta),
- a rule's `scope` changes (add/remove the user from specific spaces' matcher sets).
Matching itself is cheap (typename/feed); the cost is keeping the index fresh, owned by the Agent DO
which already observes membership.

## How the two concrete cases map
- **Message in a channel** → `when: { kind: 'feed' }`, `match.typename: 'org.dxos.type.message'`,
  `match.where: sender.role != 'assistant'`, `scope: all except muted channels' spaces`. The feed seam
  already surfaces the item; the *personal rule* (not a shared object) decides you want channel
  messages, so there's no need to special-case channel feeds vs transcript/RSS/AI feeds — your rule
  names the typename and (optionally) narrows by feed/space scope.
- **Message in a thread / any new object** → `when: { kind: 'subscription', query: select(Message)… }`
  via the `onObjectsChanged` path. "Any type of object in any scope" is exactly a subscription rule.

## What changes vs. what's already built
- **Keep**: the Edge `notification-service` delivery layer (Workstream A) and the client
  device-registration layer (SW push listeners + subscribe + `registerPushSubscription`).
- **Bring back**: a `NotificationRule` type (now **personal-space-scoped**) and `plugin-notifications`
  — to manage rules in your personal space (simple toggles + advanced `react-ui-form`) and to own
  device registration.
- **Add (server)**: a dedicated per-identity `NotificationIndexer` DO that compiles personal rules into
  per-space matcher sets (using Agent-DO membership) and evaluates them on existing event signals →
  `publish`.
- **Refactor**: move `PERSONAL_SPACE_TAG`/`isPersonalSpace` from `@dxos/app-toolkit` into
  `@dxos/echo-protocol` so Edge can reference the tag.
- **Adjust delivery (A)**: switch the device-subscription account identifier from identityKey **hex**
  to **DID** (registration + fan-out), since this layer standardizes on DID.
- **Drop**: the rule-authored `audience` resolver and the standalone "SendNotification operation fired
  by a shared trigger" — unnecessary once the recipient is implicitly the rule owner.
- **Possibly drop/repurpose**: the `TopicPreference` D1 table from Workstream A — per-user muting is now
  just personal `NotificationRule`s (or their absence). Keep D1 only as an optional cache.

## Phasing
0. Refactor `PERSONAL_SPACE_TAG`/`isPersonalSpace` → `@dxos/echo-protocol`; switch the delivery layer's
   account id from hex → DID.
1. Define `NotificationRule` in `@dxos/types` reusing `Trigger.Spec` for `when`, + a per-typename default
   template.
2. `NotificationIndexer` DO: read personal-space rules + Agent-DO `listSpaceIds`; compile per-space
   matcher sets; evaluate on the **feed seam** first (channel-message case) → `publish` to owner DIDs.
3. `plugin-notifications`: simple per-space/per-channel toggles writing personal rules; keep device reg.
4. Add the **subscription** path (thread/any-object), `scope` deny/allow + per-type, `excludeOwnActions`,
   `throttle`, advanced `react-ui-form` editor; extend match toward full query AST.
5. Retire `TopicPreference` D1 in favour of personal rules (optional).

## Decisions (resolved)
1. **Spec reuse**: reuse `Trigger.Spec` (subscription/feed) if the `@dxos/types → @dxos/compute`
   dependency is clean; mirror only as a fallback.
2. **Indexer**: a dedicated per-identity `NotificationIndexer` DO; evaluation is a sibling matcher pass
   it owns (not injected into the function-`TriggersDispatcher`).
3. **Identity**: represent identities as **DID** throughout (owners, recipients, delivery account id).
4. **Match depth**: support whatever subscription triggers support, converging on **full query AST**.
5. **Personal-space tag**: factor `PERSONAL_SPACE_TAG` into `@dxos/echo-protocol` for Edge access.

## Open questions
1. Index freshness vs cost: recompile on rule edit / join-leave / scope change; the `NotificationIndexer`
   observes personal-space rule changes (replicated) + Agent-DO membership deltas.
2. Throttle/batch state: per-(rule, space) window for "N new messages."
3. Scale: a user in many spaces × many rules → many compiled matchers; matching is cheap, but bound the
   index size / lazy-compile per active space.
4. Privacy: compiled matchers stay Edge-internal; confirm nothing about a user's rules is observable to
   other space members.
5. DID derivation: confirm the canonical hex→DID mapping for space members matches the DID scheme used
   by `message.sender.identityDid` and `edgeAuth`'s `userIdentity` (`did:halo:…`).
