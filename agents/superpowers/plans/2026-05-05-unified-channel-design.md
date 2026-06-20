# Unified `Channel` design — feed-backed conversations across plugins

Date: 2026-05-05
Branch: `claude/unified-channel-design`
Status: Design — open for review.

## Problem

DXOS has accumulated several chat-shaped data types with overlapping shape but inconsistent storage:

- `Thread` (`@dxos/types`) — bounded conversation, AutoMerge-graph (`messages: Ref<Message>[]`).
- `Channel` (`plugin-thread`) — wraps `Thread[]` for "container of threads" UX.
- `Mailbox` (`plugin-inbox`) — feed-backed, has filters and draft semantics.
- `AiChat` (`assistant-toolkit`, `org.dxos.type.assistant.chat`) — feed-backed, has `view` and `CompanionTo` artifacts.
- `Chat` (PR #11242, draft, `org.dxos.type.chat`) — proposed feed-backed peer for Slack/Discord.
- `AiSession` (`core/assistant`) — runtime that drives `Feed.append`/`Feed.query` over a chat's feed.

Symptoms:

- Comment threads materialize one ECHO/AutoMerge object per `Message`. Doesn't scale to externally-synced sources (Slack channels: 100k+ messages).
- "Which type do I use?" decisions for plugin authors. The answer today is a coin flip between `Thread` and `Mailbox`-shaped.
- A unified inbox / cross-conversation search / AI summarization has to enumerate types instead of querying one shape.
- The draft Slack PR adds a _third_ feed-backed schema with the same `{ name, feed, ... }` shape.

## Decision

Introduce a single feed-backed conversation primitive — **`Channel`** — for native multi-party conversations (Slack channels, Discord channels, native DXOS DMs, and any future plugin matching the same UI shape). Two adjacent types (`Mailbox`, `AiChat`) stay separate because their interaction patterns genuinely differ.

**Scope-limited initial change.** Comment threads (`plugin-thread`) intentionally stay on the existing AutoMerge `Thread` schema in this round. They conceptually belong on `Channel` and may migrate later, but excluding them keeps the blast radius small: no comment-data migration, no `AnchoredTo` retargeting, no editor / UI churn in `plugin-thread`. The doc preserves the design intent for that future migration in a dedicated section below.

### Type landscape (initial)

| Plugin                        | Type                   | How it's distinguished                                            | Storage         |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------- | --------------- |
| `plugin-slack`                | `Channel`              | meta key `{ source: 'slack', id: ... }`                           | feed            |
| `plugin-discord`              | `Channel`              | meta key `{ source: 'discord', id: ... }`                         | feed            |
| Native DXOS DM                | `Channel`              | no extras — just a `Channel`                                      | feed            |
| `plugin-thread` (comments)    | `Thread` _(unchanged)_ | AutoMerge `messages: Ref<Message>[]`, `AnchoredTo(Thread, range)` | AutoMerge graph |
| `plugin-inbox` (Mailbox)      | `Mailbox`              | filters, draft handling, label-as-folder                          | feed            |
| `assistant-toolkit` (AI Chat) | `AiChat`               | `view`, `CompanionTo` artifacts, always-respond loop              | feed            |

The existing `Channel` wrapper in `plugin-thread` (the `defaultThread + threads[]` AutoMerge object) gets renamed or replaced to free the `Channel` typename for `@dxos/types`. This is a small, contained change — that wrapper has limited consumers.

### `Channel` schema (proposed)

```ts
// @dxos/types
export const Channel = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
}).pipe(Type.makeObject({ typename: 'org.dxos.type.channel', version: '0.1.0' }), FeedAnnotation.set(true));

export const make = (props: Omit<Obj.MakeProps<typeof Channel>, 'feed'> = {}) => {
  const feed = Feed.make();
  const channel = Obj.make(Channel, { feed: Ref.make(feed), ...props });
  Obj.setParent(feed, channel); // The feed's parent is the channel.
  return channel;
};
```

The factory mirrors the existing `Mailbox` pattern: create the backing `Feed`, then call `Obj.setParent(feed, channel)` so the feed object's parent is the channel. This is required so the feed is properly scoped to the channel for app-graph traversal, lifecycle, and cleanup. (TODO upstream: declare parent relationship in the schema instead of imperatively in `make()` — same TODO `Mailbox.make` carries.)

The schema deliberately stays thin. Variation lives in:

- **Relations**: `CompanionTo` (assistant config / artifacts). `AnchoredTo` is reserved for the future comment-thread migration.
- **Meta keys** on the `Channel` for external sync identity (`{ source: 'slack', id: 'T123/C456' }`). Plugin-slack queries by meta to find its channels.
- **Per-message state**: threading via `Message.threadId` and `Message.parentMessage` (already on `Message`). Status changes via system events appended to the feed (when statuses are wanted).

### Why not unify with `Mailbox` / `AiChat`

The defining criterion for `Channel` is **interaction pattern and UI shape**: anything that reasonably renders as a Slack-like multi-party chat interface. Slack/Discord channels, native DMs all pass this test, and comments would pass it too (and may migrate in a later round). They're list-of-messages-from-multiple-senders with optional threaded replies, where the natural rendering is a chat surface.

`Mailbox` and `AiChat` fail it:

- **`Mailbox`** is an email client. The UI is list/reading-pane, not a turn-taking chat surface. Interaction is pull-based (refresh, scan, open), threading is reconstructed from headers, drafts are first-class, label-as-folder is the navigation model. Trying to render mail in a chat UI loses what makes mail useful.
- **`AiChat`** is a single-player assistant interface. The UI is turn-taking with the user, reasoning blocks shown inline, tool calls visualized, view modes (`normal | summary | thinking | debug`) for controlling what surface area you see. The "always respond" loop is core to the experience. Trying to render an AiChat in a chat UI loses the turn semantics and the AI-specific affordances.

The schema-level differences (`Mailbox.filters` and draft handling; `AiChat.view` and `CompanionTo` artifacts) are _consequences_ of these distinct interaction models, not the root cause for keeping them separate. Forcing a single union schema with optional `view`/`filters` fields would create a god-schema whose UI dispatch logic eventually re-invents three separate surfaces anyway.

The shared layer for cross-cutting infrastructure (search, AI summarization, unified inbox) is the _protocol_ — `feed: Ref<Feed>` of `Message` entries, marked by `FeedAnnotation` — which all three types satisfy. That's the right level of unification; schema unification would be too aggressive.

**Test for future plugins:** "Would this render naturally in a Slack-like multi-party chat surface?" If yes, use `Channel`. If no, define your own type that still uses `feed: Ref<Feed>` of `Message`s so it participates in the shared protocol.

## Comment threads (deferred to a later round)

Comments stay on the existing `Thread` schema for this initial change. The shape and semantics that comments would adopt under `Channel` are captured here so the design intent isn't lost when the migration is revisited.

Today: each `Thread` is its own ECHO object holding `messages: Ref<Message>[]`. `AnchoredTo` points at the `Thread`. Status (`staged | active | resolved`) is a field on `Thread`.

Future shape (for a follow-up migration): **one `Channel` per document** holding all of that document's comment threads in a single feed.

- Each comment thread becomes a group of messages in the channel sharing `threadId === rootMessage.id` (mirrors Slack's `thread_ts === root.ts`).
- `AnchoredTo` retargets to the **thread root `Message`**, not to the channel itself. The anchor binds a thread-as-conversation to a position in the doc.
- Thread status becomes feed events: a "resolution" system message gets appended; reading status = scan latest resolution event for that thread root. Append-only, no in-place mutation.

Trade-off (when the migration happens): a comment-heavy doc gets one larger feed instead of N small feeds. This is the right scale unit — "all comments on this doc" is the natural query — and avoids per-thread feed overhead for typically short conversations.

Reasons to defer:

- Comment data is live in user spaces; a migration script needs care.
- `AnchoredTo` retargeting touches the editor / decoration plumbing in `plugin-thread`.
- The native-channel work doesn't require it; comments can ride along later.

## AI participation in `Channel`

Two distinct interaction patterns, two types:

### `AiChat` — single-player assistant

- 1:1 between the user and their assistant.
- "Always respond" semantics: every user message triggers a turn.
- Driven by `AiSession` running an always-respond loop over the chat's feed.
- `view` field for per-chat display preference; `CompanionTo` for bound artifacts/skills.

### `Channel` — multi-player conversation, AI as participant

- N humans (and bots) participating.
- "Respond on demand" semantics: AI replies only when @-mentioned.
- The `Channel` schema doesn't know about AI. AI participation is a trigger registered by `plugin-assistant`:
  1. Trigger watches channels the user has opted the assistant into (opt-in via `CompanionTo(Channel → AssistantConfig)`).
  2. When a `Message` lands in the feed with an `@assistant` mention block, the trigger constructs an `AiSession` over **the channel's own feed**, runs one turn, appends the response.
  3. `AiSession` exits. No follow-up until the next mention.

The runtime symmetry: **`AiSession` drives an AI turn over any `Feed<Message>`**. What differs between `AiChat` and `Channel` is _when_ a session is spun up — every user message vs. only on mention.

This is why `AiChat` stays a separate type: the always-respond loop has different transactional shape (UI blocks for the turn, streaming reasoning blocks, implicit single-participant assumption). A Channel reply from AI is just another async message; turn semantics are absent.

## Refs into feeds

A foundational assumption: `Ref<Message>` to a message stored in a feed resolves correctly. Confirmed in [`Feed.ts`](packages/core/echo/echo/src/Feed.ts) — `append(feed, items: Entity.Unknown[])` stores full ECHO entities, and `Feed.getQueueDxn` derives a queue DXN that Refs can target. This is what would make the future comment-thread migration viable: external Refs to specific comments (anchors, AI quotations, mentions) would keep resolving without any new infrastructure.

## `CompanionTo` vs `AnchoredTo`

These stay distinct — they encode different semantics:

- **`AnchoredTo(target, anchor)`** — spatial/positional binding. A comment-thread root anchors to a doc range. Used for things that have a _location_ in another object.
- **`CompanionTo(channel, artifact)`** — artifact/configuration binding. An AI Chat has companion skills, attached objects, configured personas. Used for things conceptually _attached_ to a chat without occupying a position.

`Channel` uses `CompanionTo` for things like per-channel assistant config. `AnchoredTo` is reserved for the future comment-thread migration; native channels (Slack/Discord/DMs) don't need it.

## Implementation plan

Concrete change set for this PR:

1. **Add `Channel` to `@dxos/types`.**
   - New file `packages/sdk/types/src/types/Channel.ts` exporting the schema and a `make` factory that creates the backing `Feed` and calls `Obj.setParent(feed, channel)`.
   - Re-export from `packages/sdk/types/src/types/index.ts`.
   - Typename: `org.dxos.type.channel`.
2. **Update `plugin-thread`.**
   - Delete the existing `packages/plugins/plugin-thread/src/types/Channel.ts` (the AutoMerge `defaultThread + threads[]` wrapper).
   - Update `ChannelContainer` (and its storybook) to construct the new feed-backed `Channel` and render messages as a **flat feed** — no `threadId`-based thread grouping in this round.
   - `Thread` (used by comments) is unchanged.
3. **Migrate `plugin-meeting`.** This is the bulk of the cross-plugin work — Meetings reference `Channel` for in-meeting chat. Files to update:
   - `src/capabilities/app-graph-builder.ts`
   - `src/capabilities/react-surface.tsx`
   - `src/capabilities/call-extension.ts`
   - `src/operations/definitions.ts`
   - `src/operations/set-active.ts`
   - `src/containers/MeetingsList/MeetingsList.tsx`
   - `src/containers/MeetingContainer/MeetingContainer.stories.tsx`
     Wherever meeting code reads `channel.defaultThread` or `channel.threads`, switch to "the channel's feed of messages" or drop the indirection if it was only being used to find the single chat for the meeting.
4. **Update `plugin-transcription`** — `src/stories/useIsSpeaking.tsx` (one story).
5. **Update tests and stories** broken by the shape change. No live-data migration (fresh enough feature).

Out of scope (future rounds):

- **Threading UI in `Channel`.** Reconstructing thread groupings from `Message.threadId` in the rendering layer. Deferred.
- **`plugin-slack`.** Updates PR #11242 to use the new `Channel` after this lands. PR stays open in the meantime.
- **AI participation in `Channel`** — mention block recognition, `plugin-assistant` trigger, `CompanionTo(Channel → AssistantConfig)`.
- **Comment-thread migration** to `Channel` (see "Comment threads (deferred to a later round)" above).
- **`AiChat` and `Mailbox`** stay as-is in their existing packages.
- **Future sync plugins** (Discord, Matrix, IRC bridges) follow the same `Channel` pattern. Source-specific quirks (e.g., Discord modeling threads as child channels upstream) flatten into our model — Discord threads land as `threadId`-grouped messages in the parent channel's feed, the same as Slack thread replies. We don't need to mirror upstream topology faithfully.

## Open questions / out of scope

- **Mention block kind.** AI-on-mention requires a stable `MentionBlock` content kind referencing the assistant `Actor`. May already exist in `ContentBlock`; verify before implementing the trigger.
- **Assistant config per channel.** `CompanionTo(Channel → AssistantConfig)` is the proposed pattern for opting an assistant into a channel with persona/skill/toolkit settings. Want concrete design of `AssistantConfig` shape.
- **Per-thread permissions / mute.** With one feed per channel, per-thread permissions/mute aren't naturally separable. Not a current requirement; if it becomes one, the escape hatch is per-thread `Channel` objects with `parent: Ref<Channel>`. Default is to keep threads as `threadId` groupings.
- **Generic `Channel` vs source-specific types.** `plugin-slack` and `plugin-discord` use `Channel` directly with meta-key identification. If a plugin grows source-specific schema-level fields that don't fit on `Channel`, fork at that point. Today no source needs this.
- **Edit semantics on feeds** (relevant to the future comment migration, not this round). Does in-place mutation work for feed-stored objects, or does editing a `Message`'s content require remove + re-append? Affects how typo-fix-on-comment would be implemented post-migration. (Status changes don't depend on this — they're feed events.)

## Loose ends acknowledged but deferred

- **`view` field on `AiChat`** — UI display preference (`normal | summary | thinking | debug`). Stays where it is; AI-specific.
- **Mailbox's `filters`** — could split out as a relation/companion long-term; out of scope for this change.
