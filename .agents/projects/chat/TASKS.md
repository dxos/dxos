# First-party chat — TASKS

See DESIGN.md for the unified model (Channel-only, threads = `threadId`
partitions, single-writer feed items) and the feed-live-objects roadmap
dependency.

## Status

Project created 2026-07-29; design unified same day. Architecture review
DONE: no new plugin — all work lands in `plugin-thread` (stage 1), renamed to
`plugin-chat` when proven (stage 2), review unification last (stage 3).
Stage-1 schema slice DONE (`parentMessage` → Ref, `Reaction` type).
NEXT: the `properties`-bag evaluation, then thread-first UX.

## Decisions log

- [x] No new plugin; harden plugin-thread's Channel path.
- [x] Channel absorbs Thread — no Thread object; thread = `(feed, threadId)`.
- [x] Comments = per-document Channel, `threadId = anchor id`, no per-thread
      `AnchoredTo`.
- [x] Reactions = per-author `Reaction` feed items folded at read (single-
      writer principle); NOT a Message property, NOT a Relation.
- [x] Replies = `Message.parentMessage` refs.
- [x] Presence/typing = ephemeral EDGE messaging, never feed blocks.
- [x] Ship gate: feed phase 1 lands before chat ships to real users.

## Stage 1 — prototype in plugin-thread

### Schema / types

- [x] Fix `Message.parentMessage`: bare `Obj.ID` → `Ref(Message.Message)`
      (self-reference via `Schema.suspend`); schema bumped to
      `org.dxos.type.message:0.2.0`. Consumers updated: inbox draft
      create/order, assistant `execution-graph`, the onboarding exemplar
      script + its generated `dx.json`, and the Timeline `research.json`
      fixture. No migration: `isInstanceOf` ignores the version, and the only
      writer (inbox reply drafts) is still unreleased. `AgentStatus`
      (`@dxos/ai`) has its own `parentMessage` and stays an `EntityId` — it
      addresses tracing-queue items, not feed messages.
- [ ] Evaluate replacing the `Message.properties` bag with strongly-typed
      ECHO annotations (`topic`/`resolved` as typed annotations). Audit
      existing `properties` consumers first — the schema's LabelAnnotation
      reads `properties.subject`; inbox/assistant write other keys — so this
      needs a migration story, not a swap.
- [x] Add `Reaction` (`org.dxos.type.reaction` v0.1.0: `target: Ref<Message>`,
      `emoji`, `sender: Actor`, `created`) to `@dxos/types`; registered in the
      plugin's schema module (all three entrypoints: browser/node/workerd).
      Fold and toggle helpers are deliberately deferred to the UI task that
      needs them, so they land with tests against real usage.
- [ ] Define `topic` (thread name, roots only) via the mechanism chosen
      above.
- [ ] Decide reaction identity/toggle mechanics: locate own reaction by
      `(sender, target, emoji)` query → `Feed.remove` to un-react; confirm
      idempotency under offline retry.

### Thread-first channel UX

- [ ] Main view: filter roots (`threadId == null` — verify filter semantics
      for absent field over the feed query path).
- [ ] Thread summary fold: reply count, participant set, last-activity per
      `threadId` (headless util + tests; then a `ThreadSummary` row component
      in `react-ui-thread` idiom).
- [ ] "Start thread" affordance on any root message; thread panel
      (companion/deck surface) filtered by `threadId`.
- [ ] Reply composer defaults into the open thread; main composer posts roots.
- [ ] Topic set/rename = author re-append of root with `properties.topic`;
      render topic in summary row + thread header.
- [ ] Deep-link a thread (coordinate with url-deck grammar — plugin-projects
      has the same open need for chats; ask Josiah before inventing).

### Message actions

- [ ] Edit: author-only guard → `Obj.update` (re-append); edited indicator
      (compare `created` vs block append time? decide signal).
- [ ] Delete: `Feed.remove`; tombstone rendering ("message deleted" stub)
      since deleted objects hydrate with `Obj.isDeleted`.
- [ ] Reactions UI: picker on hover/long-press; folded chips with counts +
      own-state highlight; un-react on click.
- [ ] Storybook coverage: message actions, reaction fold, thread summaries,
      thread panel (plays for send/edit/delete/react/start-thread).

### Stage-1 verification

- [ ] Unit: folds (reactions, summaries), reaction toggle idempotency.
- [ ] Storybook plays as above; two-client storybook for optimistic send +
      cross-peer convergence if the harness allows.
- [ ] Manual: offline send (airplane-mode) → reconnect → `blocksToPush`
      drains; edit/delete propagation between two clients.

## Stage 2 — rename plugin-thread → plugin-chat

- [ ] Package rename `@dxos/plugin-thread` → `@dxos/plugin-chat` (moon
      project, package.json, imports repo-wide — no shims).
- [ ] Plugin id `org.dxos.plugin.thread` → `org.dxos.plugin.chat`
      (dx.config.ts, translations namespace, any persisted references —
      check settings/layout state for stored plugin ids).
- [ ] `threadTranslations` shared import in plugin-review — rename or inline.
- [ ] composer-app registry + PLUGIN.mdl/docs; changeset (consumer-relevant).
- [ ] Decide fate of standalone `ThreadArticle` surface pre-deletion (hide
      creation? keep rendering existing Threads until stage 3 migration?).

## Stage 3 — review unification (sequence with document-revisions)

- [ ] Comments Channel per document: created lazily on first comment;
      relation Channel → document (pick relation type = companion pattern);
      navtree exclusion verified.
- [ ] Review containers read/write the comments channel: threads =
      `threadId = anchor id`; ordering by anchor position; `resolved` via
      root-message property (validate; fallback design if it fights the
      single-writer rule for multi-party resolve).
- [ ] Confirm identical-anchor join semantics; orphaned-anchor rendering.
- [ ] Migration: for each existing review Thread (`AnchoredTo` → `Thread` →
      `messages[]` ref-array): append messages to the document's comments
      channel feed with `threadId = anchor`, carry `status`; then delete
      Thread objects; then remove `Thread` from `@dxos/types` + plugin schema
      modules (breaking — changeset major consideration).
- [ ] Delete `ThreadArticle` and thread-object creation surfaces.
- [ ] Coordinate: land AFTER document-revisions' in-flight plugin-review work
      (#12339 arc) or rebase theirs — agree sequencing with burdon first.

## Stage 4 — post-unification follow-ups (after stage 3)

- [ ] Notifications: subscription trigger on the channel feed (`created` +
      not-own-message → notification operation); verify trigger dedup
      behavior.
- [ ] Presence/typing: ephemeral EDGE-messaging primitive (typing indicator +
      online roster); document the primitive — candidate for extraction, cf.
      plugin-calls swarm presence. Explicitly not feed-backed.

## Blocked / needs a separate fix

- [ ] `moon run plugin-onboarding:build-exemplar` fails on `main`
      (`Missing "#model" specifier in "@dxos/plugin-onboarding"` — vite-node
      resolves plugin-sketch's `#model` subpath import against the importing
      package). The exemplar's `parentMessage` values were therefore rewritten
      in place in `exemplar-space.dx.json` rather than regenerated; re-run the
      generator once the resolution bug is fixed. Not caused by this project —
      reproduced on a clean checkout.

## Cross-cutting / deferred

- [ ] Propose `Ref.getEntityId` in `@dxos/echo` — ~20 call sites hand-roll
      `EID.getEntityId(EID.tryParse(ref.uri)!)`, most with the banned non-null
      assertion, and this change added two more local copies. Core-API
      addition, so it needs Josiah's sign-off before it rides along.
- [ ] Assistant `Chat`/`Channel` convergence decision (leaning: parallel).
- [ ] Per-thread read-state: feed phase 2 cursor design must not preclude
      per-`threadId` high-water marks (mirrored in feed-live-objects TASKS).
- [ ] Channel management polish: sidebar grouping, membership display
      (= space membership), rename/archive.
- [ ] External backends: none until the `FeedBackend` workstream (DESIGN.md
      Appendix); `ChannelBackendProvider` stays as-is meanwhile.
