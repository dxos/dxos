# First-party chat — TASKS

See DESIGN.md for the unified model (one Channel per conversation, a thread =
a `Thread` feed object plus the `threadId` partition it names, single-writer
feed items) and the feed-live-objects roadmap dependency.

## Status

Project created 2026-07-29; design unified same day. Architecture review
DONE: no new plugin — all work lands in `plugin-thread` (stage 1), renamed to
`plugin-chat` when proven (stage 2), review unification last (stage 3).
**Stage 1 is COMPLETE** except for two items that need a human or a two-peer
harness (manual offline/propagation, two-client storybook); thread
deep-linking, parked in stage 1, landed in round 9. Rounds 2–12 of jdw's
review are folded in below, each marked with the round that asked for it;
where a round revised an earlier decision the superseded entry says so.
NEXT: stage 2 — the `plugin-thread` → `plugin-chat` rename.

## Decisions log

- [x] No new plugin; harden plugin-thread's Channel path.
- [x] Channel absorbs the legacy `Thread` object; a thread is a partition
      `(feed, threadId)`. Round 10 gave that partition a name: a `Thread` feed
      object owned by plugin-thread, whose object id _is_ the `threadId`.
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
- [x] Define the thread name — SUPERSEDED in round 4. Originally the `name`
      field of an `org.dxos.chat.thread` annotation on the root message (shape
      set by josiah 2026-07-29: one annotation per _concern_). Once threads
      became explicitly created, the name moved onto the `ThreadRoot`
      declaration and the annotation was deleted; see "Thread creation" below
      for why (naming must not be author-only).
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
- [x] "Start thread" affordance on root messages — since round 4 only on those
      with no thread yet, and it declares the thread before opening it. The
      round-1 `ThreadPanel` (rendered inside the channel article) was replaced in
      round 3 by a plank of its own.
- [x] Reply composer posts into the open thread (`AppendChannelMessage` gained
      `threadId`); the main composer still posts roots.
- [x] Thread rename — SUPERSEDED twice: the round-1 in-panel header input became
      a navtree node action in round 3, and stopped being author-only in round 4
      once the name moved to the per-author declaration.
- [x] Deep-link a thread. Parked by josiah (2026-07-29), then DONE in round 9 —
      see the URL-addressable entry in round 9 below. plugin-projects has the
      same open need and can copy the shape.
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
- [x] Reactions UI: folded pills (the `Tag` primitive) with counts and an
      own-state accent ring; clicking an active pill un-reacts. Adding one is
      three inline options plus the full emoji picker (see "Message controls").
- [x] Storybook coverage: channel side — `Roots`, `ThreadsAreCreated`,
      `CreateThread`, `DeleteOwnOnly`, `ThreadAffordances`, `EditMessage`,
      `CancelEdit`, `React`, `ReactFromPicker`; thread side — `Default`,
      `ReplyInThread`,
      `ThreadAffordances`, `QuoteReply` (banner → send → quote). The shared
      fixture (one channel; one declared thread with a reply, one plain message)
      lives in `containers/testing.tsx` so both files exercise the same feed.

### Navtree

- [x] Threads as children of the channel node (jdw round 2):
      `channelThreads` graph extension folds the feed and emits nodes carrying a
      `(channel, threadId)` `ThreadSelection` — deliberately not a bare
      `Message`, since plugin-inbox claims the article surface for every
      non-draft message.
- [x] FIXED (jdw round 3): those nodes never rendered. `getThreadNodeId`
      returned `<channelURI>/thread/<id>`, and the graph builder
      invariant-rejects any node id containing `/` (`validateSegmentId`), which
      threw inside `Graph.expand` and killed the channel's whole `child`
      relation — taking `channelChatCompanion` with it, permanently for that
      node (expand marks the key expanded before invoking the connector). Ids
      are segment-local; the builder qualifies them with the parent path itself.
      Now `thread-<id>`, asserted slash-free in `ThreadSelection.test.ts`.
- [x] One node per **root message**, not per replied-to thread (jdw round 3):
      starting a thread opens its plank before any reply exists, and a plank
      needs a node to resolve. Marking the root instead ("this message has a
      thread") is not available — that would re-append someone else's message,
      which the single-writer rule forbids. `foldThreads` still gates the _reply
      summary row_ on ≥1 reply, so the channel view is unchanged.
- [x] Threads open as their own plank (jdw round 3): `LayoutOperation.Open`
      with `disposition: 'add'` + `pivotId` = the channel's attendable, so the
      thread lands beside the channel instead of inside it. `ThreadPanel` is
      deleted; the new `ChannelThreadArticle` renders the `channelThread`
      surface, and `useChannelMessaging` holds the state both articles share.
- [x] Rename moved out of the UI onto the node (jdw round 3): a `list-item`
      action → `ThreadOperation.RenameThread` → plugin-space's shared rename
      popover anchored to the navtree row (the `RenameCallback` variant, as
      plugin-inbox does for mailbox filters). Author-gated in the connector, so
      a non-author is offered nothing rather than a silently-inert menu item.
      The in-panel "Name this thread" input and its translations are gone.
- [ ] Channel rows only grow a disclosure twisty after first hover: children
      materialize on `Graph.expand` (hover/toggle) and `role: 'branch'` is what
      would show it up front — but that comes from `AppNode.makeObject` via
      `TypeSection`, which has no pass-through, and setting it unconditionally
      would give a thread-less channel a twisty that opens onto nothing. Needs
      either a `branch` option on `makeObject`/`TypeSection` or a schema-level
      `GraphPropsAnnotation` extension (blocked: `@dxos/types` cannot depend on
      `@dxos/app-toolkit`).

### Thread creation (jdw round 4)

- [x] Threads are created, not assumed. A new `ThreadRoot` feed item
      (`org.dxos.type.threadRoot`) declares "this message starts a thread";
      `foldThreads` treats a thread as existing when it has a declaration **or**
      already holds replies (which keeps threads seeded/imported without one —
      the onboarding exemplar — addressable). An undeclared message is not a
      thread, however many messages sit beside it.
- [x] Why a per-author feed item rather than a mark on the target message: the
      declaration must be writable by whoever creates the thread, and marking
      someone else's message would re-append their item under last-flush-wins.
      Same single-writer shape as `Reaction`, folded at read.
- [x] The thread name moved from the `org.dxos.chat.thread` annotation onto the
      declaration, and `ThreadAnnotation` is deleted. REVISES the round-1
      decision (jdw: name as an annotation field) — that shape predated any
      per-thread item, and it made naming author-only, so a participant who
      created a thread on someone else's message could not name it. Naming now
      writes the caller's _own_ declaration and the newest declared name wins,
      so anyone may rename without touching another participant's item.
      (The typed-annotation pattern itself still gets its outing in stage 3,
      where review owns `resolved`.)
- [x] `ThreadOperation.CreateThread` (idempotent — skips when any declaration
      exists), `SetThreadName` (rewrites the caller's own declaration, or adds
      one), and `RenameThread` (opens the shared popover, commits through
      `SetThreadName` via the imperative `Capabilities.OperationInvoker` since
      the popover commits from a plain callback).
- [x] Hover "start a thread" appears only on messages with no thread and now
      declares before opening; the summary row appears the moment a thread
      exists, at zero replies.
- [x] Thread node icons take the Channel type's hue (read from its
      `IconAnnotation`, not hardcoded) so a thread reads as part of its channel.

### Message controls (jdw round 4)

- [x] The hover controls are a menu action graph (`MenuBuilder` +
      `Menu.Toolbar`) instead of hand-placed `IconButton`s, which also collapsed
      the two duplicated ~90-line control blocks (tile and group) into one
      `Message.Controls`.
- [x] Edit and delete moved into the overflow (⋯) menu — destructive or rare,
      so deliberately buried. Reply / start-thread / accept-reject stay in the
      toolbar.
- [x] Reaction picker (jdw round 5, Discord's arrangement): the first three
      quick reactions are inline toolbar actions and a fourth button opens the
      full emoji picker in a popover. The picker is `react-ui-pickers`'
      emoji-mart grid, extracted there as `EmojiPickerContent` so the message
      toolbar and the existing avatar pickers show the same thing rather than
      wiring emoji-mart twice. It opens from a toolbar _action_ (anchored with
      `Popover.Anchor` on the toolbar) rather than its own trigger, which keeps
      every affordance in the action graph and so in one running order. An
      intermediate dropdown-list version was replaced by this.
- [x] Reaction pills use the `Tag` primitive for shape and sizing; the accent
      ring (not a palette hue) marks "you reacted", since the palette hues are
      categorical rather than stateful.
- [x] Editing is a legible mode: the body takes an accented frame and states its
      keys, Enter commits, Shift+Enter breaks the line (matching the composer),
      Escape restores the original. Leaving edit mode is the single commit path
      and an unchanged body is not written back, so cancelling costs no
      re-append. Keymap reads callbacks through refs (the `useTextEditor`
      stale-closure hazard fixed in round 2).
- [x] FIXED a helper this exposed: plugin-review's `selectViewMode` located the
      editor's view-mode dropdown as "the last `aria-haspopup=menu` button in the
      canvas", which silently became a message's hover dropdown. The group now
      carries `testId: 'editor.toolbar.viewMode'` and the helper targets it.
- [x] Composer e2e updated for the buried actions: `Thread.editMessage` /
      `Thread.deleteMessage` open the overflow menu first (its items are portaled
      to the page root).

### Message controls, round 5 (jdw)

- [x] Two groups of controls: the three quick reactions, a `line` separator, then
      the actions that act on the message (picker · view/start thread · ⋯).
- [x] FIXED: controls acted on a group's **first** message only — a documented v1
      limitation, so reacting to, replying to, editing or deleting the third
      message in a run hit the first. Each message in a group is now its own row
      (`MessageTile` with `continuation`), carrying its own controls and editing
      state; the run still reads as one block because continuation rows draw
      neither avatar nor heading. Asserted by `GroupedMessageControls`.
- [x] The thread affordance changes state instead of disappearing — "start a
      thread" becomes "view thread" once one exists, so the control does not move
      under the cursor. The summary row still shows name · count · last activity.
- [x] FIXED the avatar rail: the connector sat `gap-2` below its avatar and
      stopped at the tile's edge, while the next avatar sits behind `pt-1` — so it
      read as dashes rather than one line. Now flush under the avatar, with
      `-mb-1` carrying it across the next tile's padding. Deliberately not
      asserted in a play (jdw: layout will keep moving).

### Stories (jdw round 5)

- [x] `Conversation` in `react-ui-thread`'s Thread stories: every message state in
      one conversation — plain, grouped, reacted (once, several ways, and on the
      second row of a group), quote-replying (alone and in a run), carrying a
      thread (one reply, a busy named one, and on the second row of a group), and
      long-form. Written at the `react-ui-thread` level (jdw) rather than against
      a channel: reactions and threads are host-provided, so static
      `getReactions`/`getThreadSummary` maps cover them, and `Ref.make` carries a
      non-persisted target so even the quotes resolve without a database. Its play
      asserts the gallery covers what it claims.
- [x] FIXED while writing it: `createMessages` (story helper) generated random
      `created` dates and never sorted them, violating the ascending input
      `Thread.Messages` documents — so day-divider ids repeated and React reported
      duplicate keys. Sorted at the source; the component's contract stands.
- [x] Story harness is now parameterized (`makeChannelStoryPlugins(seed)`) so the
      plays and any richer fixture share one wiring. Each stories file keeps its
      own decorator literal — passing the decorators themselves widens their type
      and costs `Meta`/`StoryObj` inference in the play context.

### Round 7 (jdw)

- [x] Hover controls overlay the message instead of taking a column. The row was
      `[rail | content | controls]`, so a toolbar only visible on hover narrowed
      every message by its width — a paragraph wrapped in half the space it had.
      The row is now two columns and the toolbar is absolutely positioned at the
      top-end corner, over the content, as Discord does it. - Overlaying makes transparency insufficient: an invisible toolbar over text
      swallows its clicks and text selection. `hoverableOverlayControlItem` (new,
      in `ui-theme`) drives `visibility` from the same hover state — visibility
      does suppress pointer events, and keeps the box's layout so the emoji
      picker stays anchored to it. An open menu or picker pins it visible, since
      reaching either takes the pointer off the row.
- [x] `ThreadRoot` and `Reaction` move out of `@dxos/types` into `plugin-thread`
      (jdw: neither is a general type). `ThreadRoot` first became an annotation
      on the root message, which cost a knowingly-accepted trade — declaring or
      naming someone else's message re-appends _their_ message (whole-object,
      last-flush-wins), so a concurrent edit of it can be lost. SUPERSEDED by
      round 10: the `Thread` object refs the root instead of mutating it, which
      buys the annotation's shape back without touching another author's block.
      Either way the declaration channel is gone —
      `subscribeThreadRoots`/`appendThreadRoot`, `useThreadRoots`, the
      name-by-recency fold, and the identity gating on rename.
- [x] Message UI state (editing, picking) lives in a per-tile atom that the
      control menu reads through `get`, so entering edit mode recomputes the
      action graph instead of tearing it down and mounting a new one.
- [x] Thread nodes carry the thread object as node `data`, so its label, actions
      and companions hang off the thread rather than off the channel. The article
      surface is a plain `AppSurface.object(Article, Thread)`, and the pair-shaped
      `ThreadSelection` (and the `thread-node` addressing helpers that replaced it)
      are gone.
- [x] Threads are URL-addressable: `thread/<channelId>+<threadId>` under the
      channels section path, the fixed-depth pair shape a mailbox message uses.
      This closes the deep-linking item parked in stage 1 — the grammar it was
      waiting for (a static-path `UrlBinding`) already existed.
- [x] Reaction pills are buttons: `Tag` gained a `button` variant in `react-ui`
      (pointer, hover, `aria-pressed` ring) rather than the pills pasting styles
      on at the call site, and a message that carries reactions ends its row with
      an add-reaction pill that opens the full picker anchored to itself.
- [x] The hover toolbar overlays the message instead of taking a column, and the
      quote above a reply gained the reply arrow.

### Rounds 10–12 (jdw) — a thread is an object again

- [x] `Thread` is a first-class feed object owned by plugin-thread: a ref to the
      root message, an optional `name`, and `created`. It is appended to the
      channel feed beside messages and reactions, so it needs no ref back to the
      channel. Its **object id is the `threadId`** its replies carry, which is
      what makes the partition queryable from the thread alone.
- [x] One thread per message is still the rule, but it can no longer be
      enforced: two partitioned peers can each append a `Thread` for the same
      root. Reconciling those is deliberately out of scope (TODO in
      `types/threads.ts`); until then `selectCanonicalThreads` elects the first
      in feed order, which every peer converges on once the feeds merge.
- [x] Thread nodes go through `AppNode.makeObject` like every other object node,
      so label, icon, hue, testId and persistence keys come from one place. The
      icon (`ph--chats-circle--regular`) and hue live on the schema as an
      `IconAnnotation`, not at the call site.
- [x] Field annotations: `target` and `created` are `FormInputAnnotation.set(false)`
      (neither is user-editable), and `LabelAnnotation.set(['name'])` names the
      object. Translations for the `org.dxos.chat.thread` namespace — typename
      label, plurals, `object-name.placeholder`.
- [x] The custom rename action is gone. `AppNode.makeObject` nodes already get
      rename and delete from plugin-space, so `RenameThread`/`SetThreadName` and
      their operations were duplicating a path the platform provides.

### Threads stopped loading into the app graph (jdw round 6)

- [x] ROOT CAUSE: the navtree expands a channel before anything has resolved its
      `backend.config` ref, so `Channel.getFeed` returned undefined and the
      connector returned `[]` — having registered no reactive dependency, since it
      returned before reading a single atom. Nothing could bring it back, so that
      channel listed no threads for the rest of the session however many landed in
      the feed. The article survives the same race by re-rendering; a connector
      runs once. Fixed by reading the config through `ref.atom`, which re-runs the
      connector when the target loads.
- [x] The connector moved out of the capability module (`createChannelThreadsExtension`)
      so a test can expand the channel's `child` relation for real. Three
      different faults have now emptied that relation silently — an id holding
      `/`, a throwing connector, and this — because a connector that throws or
      gives up takes the whole relation with it.
- [x] Same hazard in the feed backend provider, fixed with it: `subscribeType`
      reported an empty feed forever when subscribed before the ref resolved (a
      plank restored at startup), and `withFeed` refused the write outright. Both
      now wait for the config — the subscription retries on `onResolved`, the
      write `tryLoad`s. Note refs are minted per property access, so the read and
      the resolution callback must share one instance.
- [x] Tests: `capabilities/app-graph-builder.test.ts` — declared, named,
      reply-only, none, and the late-resolving ref (a second client reading the
      channel from disk, which is the app's state). Verified the last one fails
      against the old `Channel.getFeed` read.
- [ ] Follow-up, out of scope here: `plugin-slack`'s sync reads
      `Channel.getFeed` on a channel it has just resolved by foreign key, so it
      can refuse a write for the same unresolved-ref reason.

### Message view (jdw round 3)

- [x] Dropped the stray `border` on the channel's `Thread.Content` — the white
      box framing the message list.
- [x] Messages seat at the foot of the viewport and stay pinned to the newest
      one: `ScrollArea.Viewport` is a flex column and the virtual stack takes
      `mt-auto`, so a short thread fills downward from the composer instead of
      from the top. Pinning is observed on the content height (not on `items`)
      because the virtualizer settles tile heights over several frames, and it
      holds only while the reader is already at the foot.

### Stage-1 verification

- [x] Unit: 37 in `plugin-thread` — the folds and canonical-thread election
      (`types/threads.test.ts`, 20), reaction toggle idempotency
      (`types/Reaction.test.ts`, 3), the feed backend and `readOnce`, and the
      graph connector (`capabilities/app-graph-builder.test.ts`, 7, including
      the late-resolving feed ref and duplicate-thread election).
- [x] Storybook plays: 16 green in a real browser (11 channel + 4 thread + 1
      legacy), covering roots-only rendering, deliberate thread creation, the
      threaded reply, author-gated delete via the overflow menu, the reaction
      round trip, the channel/thread affordance asymmetry, the edit/cancel round
      trip, and the quote-reply round trip. `ReactFromPicker` asserts the popover
      only: emoji-mart renders its grid in a shadow root, so a play cannot click
      an emoji inside it — picking is covered by the inline options. Verified
      downstream: plugin-review 39 plays + 60 unit, react-ui-thread 6 plays,
      react-ui-pickers 4 plays.
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
