# First-party chat — TASKS

See DESIGN.md for the unified model (Channel-only, threads = `threadId`
partitions, single-writer feed items) and the feed-live-objects roadmap
dependency.

## Status

Project created 2026-07-29; design unified same day. Architecture review
DONE: no new plugin — all work lands in `plugin-thread` (stage 1), renamed to
`plugin-chat` when proven (stage 2), review unification last (stage 3).
**Stage 1 is COMPLETE** except for two items parked by decision (thread
deep-linking, awaiting the url-deck grammar) and two that need a human or a
two-peer harness (manual offline/propagation, two-client storybook).
NEXT: stage 2 — the `plugin-thread` → `plugin-chat` rename.

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
- [x] Evaluate replacing the `Message.properties` bag with strongly-typed ECHO
      annotations. DECIDED (josiah, 2026-07-29): **per-service typed instance
      annotations** — chat owns the thread name, review will own `resolved`. The audit
      found `properties` carrying transport headers no service should share
      (`subject`/`to`/`cc`/`messageId`/`inReplyTo`/`references`/
      `listUnsubscribe`/`snippet`/`mailbox`/`sentMessageId`, plus the
      assistant's tool-call id), so the bag stays for now; the email headers may
      migrate to their own annotation once this prototype proves out.
      Mechanism: `Annotation.make` + `Annotation.get`/`set`, stored in
      `Obj.getMeta(message).annotations` and so carried by the feed codec.
- [x] Add `Reaction` (`org.dxos.type.reaction` v0.1.0: `target: Ref<Message>`,
      `emoji`, `sender: Actor`, `created`) to `@dxos/types`; registered in the
      plugin's schema module (all three entrypoints: browser/node/workerd).
      Fold and toggle helpers are deliberately deferred to the UI task that
      needs them, so they land with tests against real usage.
- [x] Define the thread name (roots only): the `name` field of a single
      `ThreadAnnotation.Thread` annotation (`org.dxos.chat.thread`), with
      `getThread`/`getName`/`setName`. Shape set by josiah (2026-07-29): one
      annotation per _concern_, so later thread state becomes another field in
      this struct rather than another annotation. Keyed on the service, not the
      plugin id, so the stage-2 rename cannot orphan persisted values.
- [x] Decide reaction identity/toggle mechanics: `findOwnReaction` matches
      `(senderKey, target, emoji)` and `ThreadOperation.ToggleReaction`
      appends or tombstones that one item. Idempotency comes from the fold
      counting _distinct senders_, so a duplicate item from an offline retry
      cannot inflate a count (unit-tested).

### Thread-first channel UX

- [x] Main view filters roots (`selectRoots`, `threadId === undefined`). Done
      as an in-memory fold rather than a feed-level filter, which sidesteps the
      absent-field query semantics entirely — revisit only if channel size
      makes client-side folding too costly.
- [x] Thread summary fold: `foldThreads` yields reply count, participant set
      (deduped, first-seen order), name and last activity, with unit tests.
      Rendered by `Message.ThreadLink` as name · count · relative time.
      Remaining polish: participant avatars in the row.
- [x] "Start thread" affordance on every root message; `ThreadPanel` renders
      beside the channel, filtered by `threadId`.
- [x] Reply composer posts into the open thread (`AppendChannelMessage` gained
      `threadId`); the main composer still posts roots.
- [x] Thread rename in the panel header, author-only, committed on blur/Enter
      so a keystroke is not a feed re-append; the name also renders in the
      summary row.
- [ ] Deep-link a thread. PARKED by josiah (2026-07-29) until the rest is
      working — thread selection is component state for now (the navtree
      thread nodes open via surface data, not URL). Needs the url-deck
      pair-chain grammar, and plugin-projects has the same open need.
- [ ] Explore starting threads from anywhere (inside threads, from replies) —
      jdw: Discord-only for now, revisit later.

### Message actions

- [x] Hover toolbar (jdw round 2): every message offers react · delete-own;
      **the main channel adds start-thread and withholds reply, threads add
      reply and withhold start-thread** — Discord's model, deliberately
      pushing conversation into threads. The reaction picker moved into the
      hover controls so an un-reacted message carries no persistent chrome;
      the summary row now renders only once a thread exists.
- [x] Quote-reply (threads only): hover reply → banner above the composer
      names the target (cancelable; switching threads clears it) → send
      writes `Message.parentMessage` (the stage-1 Ref, previously written by
      nothing) → the sent message renders a compact quote above its body.
      Quote resolution uses `useObject` per the `useObjectReactive` idiom —
      `ref.target` is not reactive (jdw).
- [x] FIXED upstream stale-closure bug this exposed: `MessageTextbox` builds
      its CodeMirror keymap once (`useTextEditor` deps are `[id, extensions]`),
      so Enter held the first `onSend` closure forever and silently dropped
      the reply target. `Thread.Textbox` now uses the latest-ref pattern
      (identity-stable callback reading `onSendRef.current`), same as
      `EditorView.onChange`. Any host whose `onSend` closure changes between
      renders was affected.
- [x] Edit: author-only (`editable` + the tile's `isAuthor` check) → `Obj.update`,
      which the feed persists as a re-append. No edited indicator yet — the
      signal is still undecided (see the note below).
- [x] Delete: `Feed.remove` via `ThreadOperation.RemoveChannelMessage`, gated
      to the author's own messages by a new `canDelete` predicate on
      `Thread.Root` (previously any participant could delete anyone's message).
      No tombstone stub is needed: the feed query already excludes tombstoned
      items, asserted by the `DeleteOwnOnly` play.
- [x] Reactions UI: folded chips with counts and own-state highlight; clicking
      an active chip un-reacts; picker in the hover toolbar.
- [x] Storybook coverage: `Roots`, `OpenThread`, `DeleteOwnOnly`,
      `ReplyInThread`, `ThreadAffordances` (the channel/thread asymmetry),
      `QuoteReply` (banner → send → quote), `React`.

### Navtree

- [x] Threads as children of the channel node (jdw round 2):
      `channelThreads` graph extension folds the feed and emits one node per
      thread, ordered by last activity, labelled by thread name falling back
      to the root's first line. Nodes carry a `(channel, threadId)`
      `ThreadSelection` — deliberately not a bare `Message`, since
      plugin-inbox claims the article surface for every non-draft message —
      and a `channelThread` surface opens `ChannelArticle` with that thread
      already open.

### Stage-1 verification

- [x] Unit: folds (threads, reactions, participants, orphaned root) and
      reaction toggle idempotency — 15 tests in `types/threads.test.ts`, plus
      6 in `@dxos/types` for the schema changes.
- [x] Storybook plays: 9 green in a real browser, covering roots-only
      rendering, thread open/close, threaded reply, author-gated delete, the
      reaction round trip, the channel/thread affordance asymmetry, and the
      quote-reply round trip (banner, `parentMessage`, rendered quote).
- [ ] Two-client storybook for optimistic send + cross-peer convergence — not
      attempted; needs a two-peer harness.
- [ ] Manual: offline send (airplane-mode) → reconnect → `blocksToPush`
      drains; edit/delete propagation between two clients. Needs a human at a
      browser; not runnable in the agent container.
- [ ] Edited indicator: decide the signal (compare `created` against the block
      append time?) — deferred with the edit affordance shipped without it.

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

- [x] `plugin-onboarding:build-exemplar` was failing on `main`
      (`Missing "#model" specifier in "@dxos/plugin-onboarding"`), so the
      exemplar's `parentMessage` values were rewritten in place. RESOLVED by
      #12394 (plugin-sketch builds its `#model`/`#skills` entries); merging main
      let the generator run for the first time, and `exemplar-space.dx.json` is
      now genuinely regenerated — all 12 `parentMessage` values are encoded refs
      emitted by the script rather than hand-patched.

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
