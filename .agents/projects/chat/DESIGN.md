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
- A **thread** is a `Thread` object in the channel feed, and the `threadId`
  partition of that feed which carries its id (Zulip's `(channel, topic)`): the
  main view renders roots (`threadId == null`) with thread summaries; a thread
  view filters by `threadId`. Thread-first UX: any message can start a thread;
  root messages are primarily branching-off points — guided, not forced (the
  main composer remains). Creating a thread is deliberate — a message nobody
  threaded is not a thread — and the object is what makes it one.
- **Comments are a channel.** A document's comments live in a per-document
  comments Channel, related to the document and hidden from the navtree via
  the companion-chat pattern (channel-with-relation-to-object ⇒ not shown in
  the custom section). In comment channels **`threadId = anchor id`** (the
  stable cursor range): no per-thread `AnchoredTo` relations; sidebar
  placement and ordering derive from anchor position in the document. OPEN for
  stage 3: with a thread now being an object, the anchor most likely belongs on
  the `Thread` rather than in its id.

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
  2026-07-29) for metadata that genuinely belongs _on a message_; review's
  `resolved` will be one. `properties` itself stays — the audit found it carrying
  transport headers (`subject`/`to`/`cc`/`messageId`/`inReplyTo`/`references`/
  `listUnsubscribe`/`snippet`/`mailbox`/`sentMessageId`) plus the assistant's
  tool-call id, none of which chat should inherit; the email set may move to its
  own annotation once this prototype proves out. Keys are namespaced on the
  **service** (`org.dxos.chat.*`), never the plugin id, so the stage-2 rename
  cannot orphan persisted data.

  Thread state was briefly such an annotation and is **not** one any more (see
  below): marking someone else's message re-appends it, and a thread that is an
  object can be a graph node's datum.

New (shipped):

```ts
// org.dxos.type.reaction v0.1.0 — plugin-thread owns it; appended to the SAME feed as its target.
Reaction {
  target: Ref<Message>
  emoji: string
  sender: Actor
  created: string                // ISO date, mirrors Message.created
}
```

```ts
// org.dxos.chat.thread v0.1.0 — appended to the SAME feed as its messages.
Thread {
  target: Ref<Message>           // the message it branches from; hidden from forms
  name?: string                  // the type's label annotation (Zulip: topic)
  created: string                // ISO date, hidden from forms
}
```

**A thread's id is the `Thread` object's id**, which its replies carry as
`threadId`. Three things follow:

- The thread is the datum of its own graph node — built by the canonical
  `AppNode.makeObject`, so its label, icon, hue, rename and companions all come
  from the type rather than from anything the plugin passes by hand.
- Creating or naming a thread writes the thread, never another participant's
  message; renaming is open to any participant, and only the name is at stake
  under last-flush-wins.
- It carries no channel reference — it lives in that channel's feed — so a
  thread's article resolves its channel from the node it opened under (the way
  plugin-inbox resolves a message's mailbox).

**One thread per message**, enforced at creation. Duplicates are reachable only
across a network partition, where neither peer can see the other's; the fold
elects the first in feed order, which every peer converges on. Reconciling the
losers' replies is a TODO, not something stage 1 handles.

`foldThreads` also keeps a partition keyed by a _root message_ — threads seeded
or imported without an object stay readable, they just have no node — and
tolerates a missing root, since deleting the branch point must not strand its
replies.

- `resolved` — comment-thread resolution state, to ship as review's own
  annotation in stage 3 (`org.dxos.review.*`), on the message or the thread as
  that design lands.

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
  the `Chat`/`Channel` relationship is RESOLVED (2026-07-30): parallel types
  over one substrate — see "Agents".

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
5. **Stage 5 — identity & attribution groundwork** (parallel to 2–4): sender
   DIDs on user- and agent-authored messages; one live agent process per
   conversation. Fixes latent bugs in the current single-user assistant.
6. **Stage 6 — interface convergence** (after 2): the assistant chat surface
   renders on the plugin-chat message kit, parameterized by a block-render
   policy. One kit, per-surface policies — not a fork.
7. **Stage 7 — agents in channels v1** (after 3 + 5 + 6): mentions, forced
   threads, session-per-thread, provenance link + progress tile;
   client-hosted interim placement.
8. **Stage 8 — subscriptions & delivery** (extends 4): per-user thread
   membership items; notification and agent delivery routes over one
   subscription primitive.
9. **Stage 9 — space-hosted sessions & live activity**: EDGE placement, real
   agent identity, activity pulse.

Detail for 5–9 in "Agents" below.

**Ship gate:** prototype freely on the landed #12235 surface, but feed
phase 1 (version/order axis) must land before chat ships to real users — v1
live objects lean on `KEY_QUEUE_POSITION`, which is null unless
`assignQueuePositions` is on (default-off ordering guarantee).

Inherited from feed phases with no plugin changes: read receipts/unread
(phase 2 cursors), EDGE push replacing 1s polling (phase 2), history beyond
device capacity (phases 3–4).

## Agents (stages 5–9)

Decision (2026-07-30, josiah): assistant `Chat` and `Channel` stay separate
types — **a session transcript is not a venue** — but converge on everything
below the type: one `Message` schema, one feed idiom, one agent turn loop, one
message-surface component kit. Resolves the former open question (was:
"leaning parallel").

### Venue vs. session transcript

- In an assistant **chat**, the conversation IS the agent's working
  transcript: the session reifies history from the chat feed, tool calls land
  in it, context bindings live in it — the user stands inside the session.
  `Chat` keeps its extras (`instructions`, `plan`, in-feed `AiContext`
  bindings).
- In a **channel**, the conversation is a venue. An agent participating in a
  thread runs a session whose transcript is its own feed (a `Chat`); the
  channel feed receives only its final messages. The private chat is the
  degenerate case: venue == transcript, delivery == identity.

The turn loop (`AiSession`/`AgentProcess`) is identical in both modes and
never knows which one it is in. The differences are all at the edges:

|            | chat                                                               | channel thread                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| input      | harness writes the prompt `Message` straight into the session feed | the user's `Message` lands in the channel feed (an ordinary send); the agent's thread subscription delivers it (`enqueueMessage`); the session records a copy carrying a provenance ref |
| output     | the assistant block appended to the session feed IS the reply      | posting is an **action**: append a `Message` (sender = agent DID, `threadId`) to the channel feed, recorded in the session feed like any tool call                                      |
| visibility | tool calls, streaming, context chips render inline                 | final messages only; backstage reachable via the provenance link                                                                                                                        |

### Rules

- **Agent interactions force a thread.** An @-agent mention at channel level
  mints the thread at compose time (`CreateThread` is idempotent; the
  composer visibly switches to "starting a thread with X" before send — no
  post-hoc re-parenting). Human-only messages stay nudged, never forced.
- **Session per thread.** The mention spawns a session `Chat` bound to
  `(channel, threadId)`; binding mechanism is a stage-7 design task
  (thread-as-object makes `Chat → Thread` natural once cross-feed refs
  resolve; otherwise a channel ref + `threadId` pair). Spawn-time context = a
  window of channel/thread history bound via `AiContext.Binding` — data the
  session reads, not transcript. Messages arriving after spawn are live turn
  inputs via the subscription. A fresh mention elsewhere = a fresh,
  concurrent session.
- **Response policy:** respond-by-default while the session is the thread's
  sole agent subscriber and no one else is addressed; mention-gated
  otherwise. One rule everywhere — the private chat is the case where the
  condition is always true.
- **Echo suppression:** the delivery route drops messages whose
  `sender.identityDid` is the agent's own. Identity-based, not role-based —
  with several agents in a thread, `role === 'assistant'` cannot tell "me"
  from another agent.
- **Provenance:** an agent's venue messages link to the producing session;
  "view session" opens it in the chat surface as its own plank (the stage-1
  thread-plank pattern), read-only by default, joinable — anyone in the
  thread can steer the running session, not just watch it.
- **Progress is a render of the session feed.** The thread shows a
  provisional tile at the reply's landing spot, folded from the session
  feed's tail (turn started / tools begun / blocks completed). Derived state,
  never a feed block — and it survives reload because the source blocks are
  durable, which ephemeral typing-style signals cannot do. Token-level
  liveness (the dormant `SwarmTraceSink` path) is optional polish. Progress
  implies outcomes: the tile resolves to posted / failed / canceled, never
  vanishes.

### Subscription: one primitive, two delivery routes

Per-user durable **thread membership** items (single-writer, folded at read —
the `Reaction` shape): the join affordance writes one; first message
auto-joins; "X joined" lines derive at render time, never message blocks.
Written from day one so membership history is real when notification delivery
lands. Delivery routes: human subscriber → notification trigger (the stage-4
mechanism, filtered to joined threads); agent subscriber → session
`enqueueMessage`. With EDGE hosting (stage 9) both routes become literally
the same trigger machinery. Join ≠ read cursor (feed phase 2) — orthogonal
per-user facts.

### Placement is a property of the session, chosen by venue

The session's whole interface is feed reads/writes plus subscription
delivery — all replicated space data — so the loop is location-transparent by
construction.

- Private companion chat → **client-hosted** (works offline, streams tokens
  locally, the user is present by definition). IndexedDB-backed process
  manager, as today.
- Channel/thread-bound sessions → **EDGE-hosted** (the task belongs to the
  venue and must survive every laptop lid in the space). Same `AgentProcess`
  — already a suspendible, alarm-driven process; the process-manager
  capability layer is the seam where backends swap. Delivery = an EDGE
  trigger on the channel feed — the plugin-routine machinery is the agent's
  alarm clock.
- Cancel-from-thread stays in the data plane: a control item on the session
  feed that the host watches (inherits offline queueing), not an RPC path.
- Later, not v1: promotion — hand a local session to EDGE ("keep going
  without me"). State lives in the feed and the process suspends, so this is
  close to suspend-here/resume-there.

### Identity: attribution now, authority at EDGE

Rides `agents/superpowers/specs/2026-07-21-agent-identity.md`; the chat
stages schedule its two phases.

- **Stage 5 (synthetic):** stamp `sender.identityDid` on user prompts —
  `formatUserPrompt` writes a bare `role: 'user'` today, so two humans (or
  two devices) in one feed are indistinguishable — and on agent messages via
  `AgentIdentityService` reading `Agent.did`. Sufficient while writes happen
  under the mentioning user's client authority. NOTE: a synthetic `sender`
  DID is a **claim** — any space writer can stamp any DID — so it is
  attribution, never authenticated provenance; build no permission checks on
  it.
- **Stage 9 (real):** an EDGE process must authenticate to write at all,
  which forces the spec's real-identity phase: keypair-backed `did:halo:`,
  agent as space member (`SpaceMember.Role` gates it; rosters and mention
  autocomplete need no special case; the `resolveAuthor` agent-seeding shim
  is deleted per the spec). Device model: the agent identity gets one or few
  **long-lived EDGE runtime devices**, each hosting many sessions — devices
  are laptops, not tabs. Considered and declined: device-per-session (heavy;
  device admission permanently grows the append-only HALO credential graph);
  shelved for its one virtue, per-session key revocation.

### Risks / new pressure

- **Feed budget** — the one genuinely new infrastructure pressure:
  session-per-thread mints a feed per agent task against ~1000 feeds/space.
  Session feeds need a retention/GC story (disposable once the task
  concludes) or feed phases 3–4 headroom.
- **Thread deep-links** (stage-1 item, landed round 9) are a stage-7
  prerequisite: provenance links and "view session" need addressable threads
  and sessions (url-deck pair-chain grammar; plugin-projects shares the
  need).
- **Cross-feed refs**: provenance refs (session ↔ channel messages) are not
  known to resolve in either direction yet; v1 copies message content into
  the session feed and carries the ref as metadata.
- **Coordination**: stage 7 retires plugin-review's separate `agent-runner`
  loop — a review agent becomes an agent subscribed to a comments channel —
  under the same plugin-review sequencing constraint as stage 3. The
  session-binding design overlaps plugin-projects' open context/artifact
  decision; design them together.

## Open questions

- Identical anchor range ⇒ same `threadId` ⇒ comments on the same selection
  join one thread — confirm as intended UX.
- Orphaned anchors (anchored text deleted): render-as-orphaned, as review
  does today.
- `resolved` on the root message vs elsewhere — validate in stage 3.
- Who may cancel a running agent session from its thread: the mentioner or
  any thread member (leaning: any member, per the team-steerable framing).
- Session-feed retention/GC policy (see "Risks") — decide before stage 7
  ships at any scale.
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
