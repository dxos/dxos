# First-party chat — DESIGN

Native, thread-first channels on ECHO feeds. Strategy: the Bluesky-DM move —
ship the small first-party thing on infrastructure we own; defer federation.
External large-scale sources enter as processed signals via connectors; Matrix
and other external backends are a long-term concern (see Appendix). Feed-layer
dependencies live in `.agents/projects/feed-live-objects/DESIGN.md` "Roadmap".

## Model

**Channel is the only conversation type.** There is no `Thread` object.

- A **channel** is a `Channel` object in the space db plus a feed holding all
  of its messages (and reactions). Capacity today: ~10k blocks/feed,
  ~1000 feeds/space — team/community scale; feed phases 3–4 raise this.
- A **thread** is a `threadId` partition of the channel feed (Zulip's
  `(channel, topic)`): the main view renders roots (`threadId == null`) with
  thread summaries; a thread view filters by `threadId`. Thread-first UX:
  any message can start a thread; root messages are primarily branching-off
  points — guided, not forced (the main composer remains).
- **Comments are a channel.** A document's comments live in a per-document
  comments Channel, related to the document and hidden from the navtree via
  the companion-chat pattern (channel-with-relation-to-object ⇒ not shown in
  the custom section). In comment channels **`threadId = anchor id`** (the
  stable cursor range): no per-thread `AnchoredTo` relations; sidebar
  placement and ordering derive from anchor position in the document.

### Single-writer principle

Feeds have no merge semantics — conflict mode is last-flush-wins at
whole-object granularity (#12235). Therefore **no shared mutable state on feed
items**: anything multiple participants affect is expressed as separate
per-author immutable items folded at read time (Matrix's `m.reaction` shape).
Message edits are safe because they are author-only re-appends.

### Types

Existing (in `@dxos/types`, unchanged for stage 1):

```ts
// org.dxos.type.channel v0.2.0 — sdk/types/src/types/Channel.ts
Channel {
  name?: string
  backend: { kind: string; config: Ref<Obj.Unknown> }   // default: Feed
}

// org.dxos.type.message v0.2.0 — sdk/types/src/types/Message.ts
Message {
  id; created: string; sender: Actor
  blocks: ContentBlock[]
  attachments?; properties?: Record<string, any>
  parentMessage?: Ref<Message>   // reply target (org.dxos.type.message:0.2.0)
  threadId?: string              // partition key; anchor id in comment channels
}
```

Stage-1 schema fixes:

- **`parentMessage` is a `Ref<Message>`** (was a bare `Obj.ID`) — shipped.
  Self-referential, so the field is wrapped in `Schema.suspend`. A ref to
  another item in the same feed resolves because the feed handle's resolver
  carries feed context; the feed→database direction does not yet resolve, which
  is why replies point at messages and never at db objects.
- **Per-service typed annotations replace new `properties` keys** (decided
  2026-07-29). Each service attaches its own typed instance annotation instead
  of sharing one untyped bag: chat owns the thread name, review will own `resolved`.
  `properties` itself stays — the audit found it carrying transport headers
  (`subject`/`to`/`cc`/`messageId`/`inReplyTo`/`references`/`listUnsubscribe`/
  `snippet`/`mailbox`/`sentMessageId`) plus the assistant's tool-call id, none
  of which chat should inherit; the email set may move to its own annotation
  once this prototype proves out.

  ```ts
  // plugin-thread/types/ThreadAnnotation.ts
  export const ThreadName = Annotation.make({ id: 'org.dxos.chat.threadName', schema: Schema.String });
  ```

  Values live in `Obj.getMeta(message).annotations`, so they travel with the
  object through the feed codec. Keys are namespaced on the **service**
  (`org.dxos.chat.*`), never the plugin id, so the stage-2 rename cannot
  orphan persisted data.

New (shipped):

```ts
// org.dxos.type.reaction v0.1.0 — appended to the SAME feed as its target.
Reaction {
  target: Ref<Message>
  emoji: string
  sender: Actor
  created: string                // ISO date, mirrors Message.created
}
```

Per-message thread metadata, set on root messages only and folded at read:

- **thread name** — shipped as the `org.dxos.chat.threadName` annotation.
  (Zulip calls this a topic; we name it for what it is.) Renaming is an author
  re-append, so only the root's author may do it: under last-flush-wins a
  second editor would silently clobber them.
- `resolved` — comment-thread resolution state, to ship as review's own
  annotation in stage 3 (same mechanism, `org.dxos.review.*`).

A thread's id **is its root message's id**, so a thread needs no object of its
own and comment channels inherit the same rule with the anchor as the id.
`foldThreads` tolerates a missing root: deleting the branch point must not
strand its replies.

Relations: one relation per comments channel — Channel → document (companion
pattern; exact relation type chosen in stage 3). No per-thread relations.

### Reading and writing

- **Read**: reactive feed-scoped queries
  (`db.query(Query.select(Filter.type(Message)).from(feed))`) yield live
  objects (#12235). Views fold: latest-per-id and tombstones are handled by
  the index; reactions fold per `target` in the view layer; thread summaries
  (reply count, participants, last activity) fold per `threadId`.
- **Write**: `Feed.append` via the existing outbox — optimistic insert,
  unpositioned-block push with retry, `blocksToPush` as the pending-send
  indicator. Edit = author `Obj.update` (re-append). Delete = `Feed.remove`
  (tombstone). Un-react = tombstone your own `Reaction` item.
- **Notifications** (post-stage-3 follow-up): subscription triggers on the
  channel feed (`created`, filtered to not-own-message).
- **Presence/typing** (post-stage-3 follow-up): ephemeral EDGE-messaging
  primitive — explicitly NOT feed blocks (persisting typing events as
  immutable blocks would be wrong). Nearest prior art: plugin-calls swarm
  presence, already integrated in `ChannelArticle`.

### Backend layers

- `ChannelBackendProvider` (exists, plugin-level): `kind`/`makeConfig`/
  `subscribe`/`send`/`readOnly`; the default `feedChannelBackend` is the only
  provider chat needs. `readOnly` keys off foreign keys (bridged/imported
  channels render read-only).
- `FeedBackend` (future, sync-level): see Appendix.

## Relationship to existing code

- `plugin-thread` already implements feed-backed channels end-to-end
  (`ChannelArticle`, `CreateChannel` / `AppendChannelMessage` operations,
  `MessageThread` over `@dxos/react-ui-thread`). Chat = hardening this path.
- `plugin-review` today anchors ref-array `Thread` objects via `AnchoredTo`;
  stage 3 replaces that with comment channels (`threadId = anchor`). Review
  and chat share only `@dxos/types` and `react-ui-thread` (no cross-imports).
- Assistant `Chat` and inbox `Mailbox` follow the same feed-backed idiom;
  convergence with Channel is deliberately deferred (see Open questions).

## Rollout

1. **Stage 1 — prototype in `plugin-thread`** (Channel is already in
   `@dxos/types`; nothing to lift): schema fixes (`parentMessage` → Ref,
   annotations evaluation), thread-first UX, message actions, Reaction type.
   Detail in TASKS.md.
2. **Stage 2 — rename `plugin-thread` → `plugin-chat`** once the model is
   proven. Mechanical, own PR, no compatibility shims; blast radius includes
   the plugin id and the shared `threadTranslations` imported by
   plugin-review.
3. **Stage 3 — review unification**: per-document comments channels,
   `threadId = anchor`, delete the `Thread` type with a migration
   (ref-array messages → feed messages). **Sequence explicitly with
   `document-revisions` (burdon), which is active in plugin-review.**
4. **Post-stage-3 follow-ups**: notifications (subscription triggers) and
   presence/typing (ephemeral EDGE primitive).

**Ship gate:** prototype freely on the landed #12235 surface, but feed
phase 1 (version/order axis) must land before chat ships to real users — v1
live objects lean on `KEY_QUEUE_POSITION`, which is null unless
`assignQueuePositions` is on (default-off ordering guarantee).

Inherited from feed phases with no plugin changes: read receipts/unread
(phase 2 cursors), EDGE push replacing 1s polling (phase 2), history beyond
device capacity (phases 3–4).

## Open questions

- Identical anchor range ⇒ same `threadId` ⇒ comments on the same selection
  join one thread — confirm as intended UX.
- Orphaned anchors (anchored text deleted): render-as-orphaned, as review
  does today.
- `resolved` on the root message vs elsewhere — validate in stage 3.
- Assistant `Chat` / `Channel` convergence (leaning: keep parallel; converge
  only if the assistant needs channel features).
- Per-thread read-state granularity: finer than the per-feed cursor feed
  phase 2 defines — feed phase 2 should not design out per-`threadId`
  high-water marks (flagged in feed-live-objects TASKS).
- Thread-data migration mechanics for stage 3 (existing `Thread` objects and
  review comment threads).

## Appendix: external chat integration (long-term)

`ChannelBackendProvider` is the interim pluggability layer, not the end-state.
The proper way to integrate an external chat system (Matrix, etc.) natively
into Composer is one level down: **keep every Channel on the default feed
provider, and back the _feed itself_ with a different `FeedBackend`** — the
feed-as-read-through-cache model (replicated live tail + evictable cached
history ranges + watermarked paging; see feed-live-objects DESIGN.md,
"Pluggable feed backend" companion workstream). The external system then
inherits the full native experience for free — offline send via the outbox,
optimistic updates, live objects, caching, and (post-phase-2) read state —
while the chat plugin remains completely unaware of the backend.

When that lands, `ChannelBackendProvider` should be retired (or reduced to a
thin channel-creation/config concern): swapping `subscribe`/`send` at the
plugin layer loses everything the feed pipeline provides and would duplicate
it per provider. Until then it remains the cheap seam for shallow or read-only
integrations. Long-term; not scheduled in the stages above.
