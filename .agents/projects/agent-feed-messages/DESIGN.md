# Agent feed messages — process state in the feed

Move agent-process state (queued input messages, alarms) out of per-process KV
storage into the session feed, so it is durable, replicated, visible, and
managed with regular feed CRUD.

Branch: `dm/agent-feed-messages`.

## 1. Current state (analysis)

### Input queue

The agent process (`packages/core/compute/agent-runtime/src/agent-service/agent-process.ts`)
holds pending work as `AgentEvent[]` — a plain JS array mirrored into the
process-scoped `StorageService` KV under key `inputQueue` (`AgentEventsCell`,
JSON-encoded). Event union: `prompt { content }`, `tool_result { pid, result,
isError }`, `alarm { firedAt, message }`.

- Enqueue: `onInput` (from `AgentService.Session.submitPrompt` →
  `ProcessHandle.submitInput`), the `enqueueMessage` Tier-B RPC
  (`HarnessControl`), tool-child exits, and fired self-wake alarms.
- Dequeue: `onAlarm` does `inputQueue.shift()`, runs the turn, then re-persists
  the shifted array — the "ack" is the post-turn persist, so a crash mid-turn
  replays the event. Tool-result idempotency is patched over with
  `ToolCallStateCell.reported` flags + `dropReportedToolResults`.

Consequences: the queue is invisible to the UI and other peers, cannot be
inspected or edited (no cancel of a queued prompt), does not replicate, and is
lost if the process KV namespace is lost.

### Alarms

`AlarmManager` persists exactly one `{ wakeAt, message }` in the `agentAlarm`
KV cell. Setting a new alarm replaces the old (the `set-alarm` operation says
so in its description). No list, no cancel surface, no visibility.

### Reconstruction

`SessionLoader.reifyHistory(feed, messages)` only resolves fork history: finds
a `SessionLink { feedRef, messageId }` record in the feed and prepends the
source feed's messages up to the fork point. Nothing else about a session is
reconstructed from the feed — queue and alarm state live only in process KV.

### Prior art in the repo (reused here)

- `Annotation.make/get/set` — instance annotations stored in entity meta
  (`meta.annotations` dictionary). `Feed.CursorAnnotation`
  (`org.dxos.annotation.feed-cursor`) is the precedent: "a reader's position
  in a feed" as an annotation, not a foreign key.
- `Feed.remove` produces a queryable tombstone; feed re-append by id is an
  upsert (whole-object snapshot blocks, index collapses by id).
- The trigger dispatcher advances its cursor annotation only after a
  successful invocation — the ack-after-work pattern.
- No ack/dequeue API exists anywhere in echo/feed/compute today.

## 2. Design

### 2.1 Queued messages (feed CRUD)

A queued prompt is a regular `Message.Message` appended to the session feed by
the producer (UI submit, relay, `Harness.enqueueMessage`), carrying a marker
annotation:

```ts
// @dxos/assistant — session/SessionStore.ts (annotations module)
QueuedAnnotation: Annotation.Annotation<boolean>; // id: 'org.dxos.annotation.queued'
```

The pending input queue IS the set of feed messages with `QueuedAnnotation`
still present in the feed (not tombstoned), ordered by feed position. Regular
feed CRUD manages it: cancel a queued prompt = `Feed.remove` it; edit =
re-append by id.

### 2.2 Atomic dequeue (ack by echo)

When the agent takes a message from the input queue it appends its own copy
("echo") of the message to the feed, carrying an ack annotation that names the
original:

```ts
AckAnnotation: Annotation.Annotation<Ref.Ref<Obj.Unknown>>; // id: 'org.dxos.annotation.ack'
```

- The echo is the message that enters conversation history (the original never
  does — history filters out `QueuedAnnotation` items).
- The single `Feed.append` of the echo is the atomic ack: the pending queue is
  a projection — queued items minus those an ack names — so the append alone
  dequeues. Acked originals stay in the feed (nothing is removed on ack);
  `Feed.remove` is only the user-facing cancel of a still-pending item.

The annotation holds a `Ref` to the original (user correction, 2026-09-01);
typed `Ref.Ref(Obj.Unknown)` because the same annotation acks both Messages and
Alarms. `getAck` projects the referenced entity id for the queue projection, so
a cancelled (tombstoned) original never needs resolving.

### 2.3 Alarms (feed CRUD, same ack)

New `Alarm` feed record type in `@dxos/assistant` (beside `SessionLink`):

```ts
// org.dxos.type.alarm@0.1.0
class Alarm {
  wakeAt: number; // epoch ms
  message?: string; // reminder surfaced when it fires
  created: string; // ISO
}
```

- Set alarm = append an `Alarm` to the feed. Multiple alarms are naturally
  supported (improvement over the single-cell replace semantics; the set-alarm
  operation description changes accordingly).
- Cancel = `Feed.remove` the alarm (user or agent, plain CRUD).
- Fire = the agent appends the wake-up prompt Message carrying
  `AckAnnotation = alarm.id`; the alarm stays in the feed and the ack filters
  it out of the pending set. Same atomicity story as 2.2.
- The process alarm scheduler (`ctx.setAlarm`) remains the wake mechanism; the
  durable truth is the feed. `AlarmManager.wakeAt` becomes
  `min(pendingAlarms.wakeAt)`.

### 2.4 SessionStore (rename of SessionLoader, + writes)

`SessionLoader` → `SessionStore` in `@dxos/assistant`, the one component that
maps between the feed and reified session state:

Reads (reconstruct from feed): one query, one linear scan over the feed's
items to prepare the state for the next turn — no per-kind queries:

- `loadPending(feed)` → `{ pendingMessages, pendingAlarms }`: partitions items
  by type, collects the acked-id set from message AckAnnotations, then
  pendingMessages = queued ∧ ¬acked (feed-position order), pendingAlarms =
  alarms ∧ ¬acked (wakeAt order). The agent process's hot path — kept to a
  single query because it runs several times per turn.
- `loadState(feed)` → `loadPending` + `history` (messages minus queued
  originals, feed-position order, reachability via `Feed.history`, fork
  history reified).
- `reifyHistory(feed, messages)` — existing SessionLink logic, kept for the
  AiSession/Harness history path; now also drops queued originals.

Writes:

- `enqueueMessage(feed, content | Message)` — append with QueuedAnnotation.
- `ackMessage(feed, original)` — append echo with AckAnnotation (no removal);
  returns the echo.
- `setAlarm(feed, { wakeAt, message })` — append Alarm.
- `cancelAlarm(feed, alarm)` — remove (cancel of a pending alarm).
- `ackAlarm(feed, alarm, promptMessage)` — append wake prompt with ack (no
  removal).

`agent-process.ts` consumes SessionStore instead of `AgentEventsCell` /
`AgentAlarmCell` for prompts and alarms. `tool_result` events stay in process
KV for now — they are process-plumbing (pid-scoped, tied to the delegation
machinery), not conversation state; folding them in is a possible follow-up.

### 2.5 How a turn acks (implementation refinement)

`AiRequest.begin` already formats and appends the turn's user message, so a
separate echo would double the prompt in the feed. Instead the dequeue ref is
threaded `TurnRequest → AiSession.RunProps → AiRequest.begin`, which stamps
`AckAnnotation` on that user message — one append serves as prompt, echo, and
atomic ack. A producer that does not persist prompts (the Claude SDK host)
ignores the field; the process detects the still-pending item after the turn
and acks explicitly via `SessionStore.ackMessage`/`ackAlarm`, so the queue
always progresses. Crash semantics: ack lands at turn begin, so a mid-turn
crash does not replay the prompt (the KV tool_result path keeps its
at-least-once replay).

### 2.6 Surfaces

- Legacy migration: pre-existing KV queue entries drain through the old path
  first; the single KV alarm is folded into a feed Alarm once on process start.
- `Alarm` and `SessionLink` are registered in plugin-assistant `schema-defs`.
- `projectThread` (chat UI) hides a queued original once an ack names it — the
  echo carries the turn — while a still-pending original renders, giving the
  submit-while-busy UX for free.

### 2.7 Non-goals / kept as-is

- `tool_result` queue entries and `DelegationsCell` (process KV).
- `SessionLink` semantics (only relocated under SessionStore).
- Feed retention/compaction (`setRetention` is still a stub upstream).

## 3. Item 6 analysis — Chat + Agent into @dxos/assistant; Chat as session anchor

(Analysis only; not implemented in this project.)

### Current layout

- `@dxos/assistant` = session runtime (AiSession, Harness, AiRequest,
  SessionLoader/Link, tool-runtime). No schema types for Chat/Agent.
- `@dxos/assistant-toolkit` = skills/operations/commands + the `Chat`,
  `Agent`, `Memory`, `McpServer` types. Depends on `@dxos/assistant` AND
  `@dxos/agent-runtime`.
- The feed is the session identity everywhere: `AgentService` caches by
  `feed.id`, the process target annotation is the feed URI,
  `Process.Environment.conversation` is the feed URI, `Harness` resolves the
  session by feed.

### Symptoms of the current split

- `agent-process.ts:123` — "the session is feed-centric and cannot reach its
  Chat", so `Chat.instructions` is smuggled in as `Process.InstructionsAnnotation`
  at spawn time; edits to instructions mid-session are invisible.
- `Chat.getFromContext` dynamic-imports `@dxos/assistant` to avoid pulling the
  ~280 KB session runtime into the toolkit's static graph — an inverted
  dependency worked around at runtime.
- `Agent.loadChat` resolves "the" chat by ULID ordering of children — no
  stable anchor.
- The relay operation needs both the chat (instructions) and the feed
  (session) and joins them by hand.

### What the move enables

Moving `Chat` (and `Agent`) into `@dxos/assistant` and anchoring sessions on
`Chat`:

- `AgentService.getSession(chat)` — cache by `chat.id`; process target = Chat
  URI; the process resolves `chat.feed.target` and `chat.instructions.target`
  itself, killing `InstructionsAnnotation` and making instruction edits live.
- `SessionStore` can hang session-scoped state off the Chat object where the
  feed is the wrong home (e.g. a future read-cursor per member, task list
  already lives there).
- `Chat.getFromContext`'s dynamic import disappears (same package).
- Fork (`fork-chat.ts`) becomes "new Chat + new feed + SessionLink" with the
  Chat as the returned handle — already almost true.

### Dependency feasibility

- `Chat.ts` imports: `Feed` (echo — ok), `Instructions` (`@dxos/compute` — ok,
  assistant already depends on compute), `Task` (`@dxos/types`? verify — if it
  is toolkit-local it must move too or the tasks field generalizes to
  `Obj.Unknown` refs), `FormInputAnnotation` (echo internal — ok).
- `Agent.ts` imports `IdentityDid` (`@dxos/keys` — ok) and `Instructions`.
- `assistant-toolkit` keeps skills/operations and re-exports the types during
  a deprecation window — EXCEPT the repo rule forbids compat re-exports, so
  the move must update all call sites in one change (grep shows Chat/Agent
  imports across plugin-assistant, plugin-automation, edge — sizable but
  mechanical).
- Risk: `@dxos/assistant` is consumed by `agent-runtime`; adding Chat there
  lets the process reach it (that is the point) but also grows assistant's
  public surface — the bundle concern that motivated the dynamic import
  needs re-checking (types are cheap; the runtime was the heavy part, and
  types would no longer need to import the runtime).

### Recommended sequencing

1. This project (feed state + SessionStore) — independent of the move.
2. Move `Chat`/`Agent` types to `@dxos/assistant` (call-site sweep, no compat
   shims).
3. Re-anchor `AgentService`/`Process` on Chat (target = chat URI, resolve feed
   - instructions from it).
4. Retire `InstructionsAnnotation` and `Chat.getFromContext`'s dynamic import.

## 4. Decisions

- Ack identifies the original by a `Ref.Ref(Obj.Unknown)` (user correction);
  the projection reads the entity id off the ref, never resolving it, so a
  cancelled (tombstoned) original is harmless.
- Acking never removes — the pending queue is a projection (queued minus
  acked); removal is only cancellation of a pending item (user correction,
  2026-09-01).
- Queued originals carry an explicit `QueuedAnnotation` rather than being
  inferred from sender/position (explicit CRUD surface, cheap filter,
  pre-migration history untouched).
- The echo is the history record; the original never enters history.
- Multiple alarms allowed; earliest pending drives the process wake.
- `tool_result` stays in process KV (process-plumbing, not conversation
  state).
