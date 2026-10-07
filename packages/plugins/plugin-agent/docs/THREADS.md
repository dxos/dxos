# Private threads — analysis

Status: analysis for milestone M0 of [BRAIN.md](./BRAIN.md) (2026-10-07); the design choice is open.

## Requirement

The brain judges goals in **private threads**: a side channel of a session where the agent reasons
about a goal with the session's full context, which the conversation view never shows (BRAIN.md,
"Where judgment runs"). A session goal's thread lives with the session; a durable goal's thread lives
in a background session per owning actor, and promoting a goal moves its thread there. So a private
thread must:

1. be hidden from the chat view and from every other reader of the session (naming, forking, fact
   extraction);
2. give an agent turn the session's history plus the thread's own;
3. run its turns without queueing behind, or showing as activity in, the user's conversation;
4. be cheap enough to have one per goal;
5. be movable to another session when a goal is promoted.

## What exists today

### Soft fork: per-item lineage in a Feed

The only "threading" in ECHO Feeds is a soft fork for rewind-and-continue, added in PR #12387
(design: `.agents/projects/feed-soft-fork/DESIGN.md`).

- An item may name an explicit parent in `@meta` under the foreign key `org.dxos.key.feed-parent`
  (`PARENT_KEY`, `packages/core/echo/echo/src/Feed.ts`); an item without one continues from the item
  appended before it, so existing feeds are unchanged.
- `Feed.history(items, { head? })` resolves one line like `git log --first-parent`: it walks back from
  `head` (default: the last item), jumping to explicit parents and otherwise stepping to the
  predecessor. `M1 M2 M3 M4 M5(→M3)` resolves to `M1 M2 M3 M5`; M4 stays in the log, unreachable.
  A missing, malformed or forward parent stops the walk and marks the result `shallow`.
- It is a pure function over the items passed in, which must be in append order (`Feed.getPosition`).
  The design's rule is "resolve over the projection you render".
- `Feed.rewindFrom` is a one-shot marker on the Feed: the next append forks from that item. Chat's
  edit-and-resend sets it; `AiSession.appendTurnMessage` turns it into lineage and clears it.
- API: `Feed.append(feed, items, { parent })`, `setParent`, `getParent`, `history`, `getPosition`,
  `rewindFrom`.
- Users: `AiSession.getHistory`, `SessionStore.loadState`, plugin-assistant's `Chat.tsx` (edit) and
  `processor/thread.ts` (`projectHistory`).
- Tested: ~17 pure `Feed.history` cases (`Feed.test.ts`), a database round-trip
  (`echo-client/src/feed/feed.test.ts`), `AiSession.test.ts` (rewind), and plugin-assistant's
  `thread.test.ts`.
- Deferred by its design: listing branches (`Feed.branches()`), a stored head per branch and branch
  switching, branch filtering inside queries (a `limit` truncates before `history` resolves). Lineage
  is mutable: `Obj.update` re-appends the item and the last write wins.

There is no thread id, branch ref or child-feed concept.

### Hard fork: `SessionLink`

ForkChat (PR #11584, `plugin-assistant/src/operations/fork-chat.ts`) creates a new feed holding a
`SessionLink { feedRef, messageId }` (`assistant/src/session/SessionLink.ts`). At read time
`SessionStore.reifyHistory` prepends the source feed's history up to `messageId`. Limits: the cutoff
is fixed, it orders by `created` rather than feed position, and only the first link is honoured.

### Things already hidden from the chat

- **By type:** `AiContext.Binding`, `Alarm` and `SessionLink` share the chat feed and are hidden
  because readers query `Filter.type(Message)`.
- **By annotation:** `QueuedAnnotation`, `InFlightAnnotation`, `ConsumedAnnotation`
  (`SessionStore.ts`) — filtered by the session store and the chat projection.
- **By feed:** plugin-agent's fact annotation feeds (one `Feed` per source, parented to the agent) and
  the trace namespace feed.

### Fields that cannot be reused

- `Message.threadId` already carries the Claude SDK session id (agent-claude) and Slack/Discord
  thread ids (channel backends).
- `Message.parentMessage` marks tool-call and sub-agent nesting (`execution-graph.ts`), and the
  soft-fork design warns against overloading it with lineage.

### Where a thread boundary would have to be enforced

- **History:** `AiSession.getHistory` (`#messagesInAppendOrder`, before `Feed.history`), the code-mode
  producer, and `Harness.history`.
- **Queue and alarms:** `SessionStore.#scan` — otherwise the main process would dequeue a thread's
  prompts.
- **Rewind:** `appendTurnMessage` consumes the feed-global `rewindFrom`.
- **Summaries:** a summary trims everything before it (`AiPreprocessor`), so a thread's summary must
  not enter the main history.
- **Readers:** the chat projection (`processor/thread.ts`), plugin-agent `readSource` (which would turn
  leaked reasoning into facts), `update-chat-name`, `fork-chat`, `respond-to-request`, `AgentActivity`.
- **Processes:** `AgentService.getSession` keys its cache and process by `chat.id`, and the Harness
  resolves a feed's host through `Chat.loadForFeed`; a thread needs its own process key so its turns
  neither queue behind the user's nor light the chat's "running" indicator.

## Why soft-fork lineage cannot carry threads as it is

1. **The last append wins.** A thread item naming a parent becomes the feed's head, making the main
   conversation's tip unreachable — which is exactly a rewind.
2. **Implicit chaining.** A main-line message appended after a thread item, without an explicit
   parent, chains onto the thread item; the soft-fork design rejects this as misattribution.

Making lineage carry threads would need a stored head per thread and an explicit parent on every
append — the deferred "branches" work. Lineage stays useful _within_ any thread design, for rewinding
a thread.

## Designs

| Design                                     | How                                                                                                                                                        | For                                                                                                                                                   | Against                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Tag messages in the session feed**    | A new `ThreadAnnotation = threadId` on thread items; main history and views filter tagged items out before `history`; a thread's history is main ∪ its own | One feed, one ordering and cursor; cheapest per thread; follows the "resolve over the projection" rule                                                | Every reader must filter, now and in future, so leaking is the default failure; queue, rewind and summary subtleties; heaviest agent-runtime change |
| **B. Child feed per thread**               | A `Feed` parented to the chat; a turn's history is the main feed and the thread feed merged by feed position (a live `SessionLink`)                        | Hidden from every reader by construction; queue, alarms and rewind isolated per feed; promotion moves the feed; positions are comparable across feeds | One feed object per thread; `SessionLink` must become live and position-ordered; process keying and host lookup must learn thread feeds             |
| **C. Hidden `Chat` per thread**            | A full chat parented to the session's chat, marked private, with a live `SessionLink` to the main feed                                                     | `getSession`, agent-runtime and the Harness work unchanged                                                                                            | Instructions, config and bindings are copied, not shared; every chat list must exclude private chats                                                |
| **D. Extend soft fork into real branches** | Stored heads per branch, `Feed.branches()`, branch-scoped queries; a thread is a named branch                                                              | One mechanism for threads and chat branch-switching                                                                                                   | The most work; thread items still share the feed's queries and sync; every append must name its parent                                              |

All of A–C depend on the same core piece: a history that merges two lines by feed position. Feed
positions come from one counter per space and namespace, so items in different feeds of the same space
are comparable, which makes B's merge sound.

## Indexing

How each design finds a session's threads and loads a turn's history, against what ECHO indexes today.

### What is indexed

- **Objects** — `echo_entities` (`echo-sqlite/src/migrations/0001_init.sql`) is indexed on
  `(space_id, type_dxn, id)`, `(space_id, kind)`, `(space_id, parent_id)`, `source_id`, `target_id`,
  `created_at` and `updated_at`; `echo_refs` on `(space_id, target_id, prop_path)` (reverse references);
  `echo_fts` is an FTS5 trigram table.
- **Feed items** — ordered by a **global position** (`KEY_QUEUE_POSITION` in the item's `@meta`), from
  one counter per space and namespace, so items in different feeds of a space compare. A query is scoped
  to a feed with `.from(feed)`.
- **Not indexed** — `Filter.annotation` (and `has-parent`) run as post-filters after the main select
  (`echo-host/src/query/query-planner.ts`), so filtering a feed by an annotation scans it.

### Positions are assigned by EDGE

Only one peer — EDGE — assigns positions (`feed-store.ts`, `assignPositions`). A block written locally
has none until acknowledged, and `Feed.getPosition` returns `+Infinity` for it so it sorts last, as the
newest. Within one feed that preserves append order. Across feeds it does not: two unacknowledged items
from different feeds tie, so a merge of a main feed and a thread feed must break ties by local insertion
order (or `created`) until EDGE assigns positions, and re-sort once it does. This applies to every
design that orders across feeds — B, C, and `SessionLink` today.

### Per design

**B — child feed per thread** needs no new index:

| Query                               | Answered by                                                               |
| ----------------------------------- | ------------------------------------------------------------------------- |
| A session's private threads         | `Filter.type(Feed)` + `childOf(chat)` — the `(space_id, parent_id)` index |
| A goal's thread                     | A `Ref<Feed>` on the goal — direct lookup                                 |
| Which goal owns a thread            | The reverse reference — `echo_refs` on `target_id`                        |
| A thread's items, in order          | `.from(threadFeed)`, ordered by position                                  |
| A turn's history (session + thread) | A merge of two position-ordered streams; linear, no filtering             |
| The user's chat history             | The main feed alone; thread items are never read                          |

Promotion re-parents the thread feed (one `parent_id` update) and repoints the goal's ref.

**A — tagged messages in one feed** pays on every read: the main history ("no thread tag") and each
thread ("tag = T") both scan and post-filter the whole session feed, and the cost grows with every
goal's reasoning. Making it cheap needs a new indexed column for the thread tag on feed items — a
storage change to `echo-sqlite`. Promotion copies items to another feed.

**C — hidden `Chat` per thread** indexes like B (the thread chat is found by `parent_id`; its feed is its
own), plus an exclusion filter on every chat list.

**D — branches in one feed** needs what A needs (items of a branch are found by scanning lineage)
plus a stored head per branch.

## Recommendation

**B — a child feed per thread.** It is the only design that hides threads by construction rather than
by every reader remembering to filter (A), or every chat list remembering to exclude (C), and it avoids
building the branch machinery the soft-fork design deferred (D). Promotion is moving a feed, and a
background session per actor is more thread feeds of the same shape. Soft-fork lineage keeps working
inside each thread.

M0 under B:

1. Extend `SessionLink` (or add a sibling) to a live, position-ordered merge of the main feed into a
   thread's history, with tests.
2. `getSession(chat, { thread })` creates or loads the child feed and runs its process under its own
   key.
3. The Harness resolves a thread feed's host through its parent chat; context bindings are read from
   the main feed.
4. Demo: an AgentPlayground story in which the agent reasons in a hidden thread, with a debug toggle
   that renders the thread feed.
