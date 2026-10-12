# @dxos/trajectory

An agent conversation stored as an append-only log of immutable `Trajectory.Event` objects in one ECHO feed.
Nothing in the log is ever edited; every view of the conversation is derived from it by a reducer.

- `Trajectory.Event` has `sender` (`role`: `user` | `assistant` | `tool` | `event`, plus optional `identity`,
  `subject`, `name`), optional `thread` and `prev`, `created`, and a tagged `payload`.
- `Reducer.thread` renders the conversation for the UI, `Reducer.session` gives the agent process its state, and
  `Reducer.prompt` builds what is sent to the model.
- Every reducer is a left fold, so `Reducer.run(reducer, tail, checkpoint)` resumes from a saved `Checkpoint` and folds
  only the newer events.
- Threads and turns nest: each records its parent, merges into it when it ends, and `Reducer.promptFor(state, thread)`
  builds the prompt a turn in that thread sends.

## Several writers on one feed

EDGE assigns each confirmed event a feed position, and confirmed positions never move. A writer's own append shows
locally before EDGE confirms it, and it can still land after events that sync in later. Four rules follow:

- **Fold only confirmed events.** The reducers' state then depends on the feed alone, not on when each replica
  synced.
- **What a turn saw is its `from.event`.** A harness writes its confirmed feed head there. `promptFor` keeps only
  the parent entries placed at or before that position, so an event that syncs in later never enters a running
  turn's prompt.
- **A merge onto entries the turn never saw is stale.** `PromptState.stale` lists, for each such turn or fork, the
  source events it missed. The merge still happens, and the harness decides whether to accept, re-run or correct.
- **The first consume in feed order claims a message.** A later consume of the same message is listed in
  `SessionState.rejected`, and it changes neither the prompt nor the UI. A harness runs a turn only once its consume
  is confirmed and not rejected.

If a thread merges while a turn inside it is still running, the thread is kept frozen until that turn ends, so the
turn's prompt does not change under it.

## Sample trajectories

Both samples are built and asserted, output for output, in [`src/samples.test.ts`](src/samples.test.ts).

### 1. A chat turn with a tool call and a prompt typed mid-turn

Each turn is a thread: `turnBegin` opens it, records in `from` the parent thread and the last event the turn could see,
and every event the turn produces carries `thread: <turnBegin id>`. `turnEnd` merges the turn into its parent as one
block, so turns from two writers never interleave.

| #   | sender     | thread | payload                                                    |
| --- | ---------- | ------ | ---------------------------------------------------------- |
| 1   | user alice |        | `message` "What is the weather in Oslo?"                   |
| 2   | assistant  |        | `turnBegin { model, from: { event: #1 } }`                 |
| 3   | assistant  | #2     | `promptConsume { message: #1 }`                            |
| 4   | assistant  | #2     | `message` toolCall `weather({"city":"Oslo"})`              |
| 5   | user alice |        | `message` "And in Bergen?" (typed mid-turn)                |
| 6   | tool       | #2     | `message` toolResult "12°C, rain"                          |
| 7   | assistant  | #2     | `message` "Oslo is 12°C with rain."                        |
| 8   | assistant  |        | `turnEnd { begin: #2, finishReason: 'stop' }`              |
| 9   | assistant  |        | `turnBegin { model, from: { event: #8 } }` (the next turn) |
| 10  | assistant  | #9     | `promptConsume { message: #5 }`                            |

While turn #2 runs, the main prompt is empty and `Reducer.promptFor(state, #2)` is what the turn sends. #8 merges it into
main as one block, and the follow-up typed during the turn stays held, so the prefix the running turn sent never
changes:

```text
user: What is the weather in Oslo?
assistant: toolCall
tool: toolResult
assistant: Oslo is 12°C with rain.
```

`Reducer.promptFor(state, #9)` after #10 is those four lines followed by `user: And in Bergen?`. It only extends the
prompt, so the provider's prompt cache covers everything sent before.

`Reducer.session` after #8: `queue` is `[#5]` and `turns` is empty. `Reducer.thread` shows #5 where it was typed, as
`queued`, until #10 moves it to the end as `consumed` in thread #9, the position the model sees it at. After #10 it
lists #1, #4, #6, #7 in thread #2, then #5 in thread #9.

### 2. An alarm, a subagent thread and a compaction

| #   | sender       | thread | payload                                                                   |
| --- | ------------ | ------ | ------------------------------------------------------------------------- |
| 1   | user alice   |        | `message` "Watch CI and tell me what fails."                              |
| 2   | assistant    |        | `promptConsume { message: #1 }`                                           |
| 3   | assistant    |        | `alarmSet { wakeAt, message: 'check CI' }`                                |
| 4   | assistant    |        | `threadOpen { mode: 'fresh', purpose: 'triage failures' }`                |
| 5   | assistant    | #4     | `message` "Reading the failing logs."                                     |
| 6   | event alarm  |        | `alarmFire { alarm: #3 }`                                                 |
| 7   | event alarm  |        | `message` "CI finished: 2 failures."                                      |
| 8   | assistant    |        | `threadMerge { thread: #4, mode: 'summary', summary }`                    |
| 9   | assistant    |        | `compact { from: #1, to: #7, summary }`                                   |

`Reducer.prompt` after #8. The subagent's own work (#5) stays in its thread, and only its summary reaches the main
prompt:

```text
user: Watch CI and tell me what fails.
event: CI finished: 2 failures.
event: Both failures are a flaky echo test.
```

After #9 the range #1–#7 is replaced by its summary. This is the one event that rewrites the prompt rather than
extending it:

```text
event: Alice asked to watch CI; it finished with 2 failures.
event: Both failures are a flaky echo test.
```

`Reducer.session` after #8: no pending alarms, and thread #4 is `merged`.

### 3. Two harnesses race for one prompt while a notice syncs in

A laptop and an EDGE agent share the feed, and both see #1 as their head.

| #   | sender           | thread | payload                                                           |
| --- | ---------------- | ------ | ----------------------------------------------------------------- |
| 1   | user alice       |        | `message` "Summarise the design doc."                             |
| 2   | assistant laptop |        | `turnBegin { model, from: { event: #1 } }`                        |
| 3   | assistant edge   |        | `turnBegin { model, from: { event: #1 } }`                        |
| 4   | assistant laptop | #2     | `promptConsume { message: #1 }` (confirmed first, so it wins)     |
| 5   | assistant edge   | #3     | `promptConsume { message: #1 }` (rejected)                        |
| 6   | assistant edge   |        | `turnEnd { begin: #3, finishReason: 'other', error }`             |
| 7   | event alarm      |        | `message` "CI is green." (lands on main while the laptop runs)    |
| 8   | assistant laptop | #2     | `message` "It replaces messages with one event log."              |
| 9   | assistant laptop |        | `turnEnd { begin: #2, finishReason: 'stop' }`                     |

The edge harness sees #5 in `Reducer.session`'s `rejected` and ends its turn without calling the model. The laptop's
turn sent only `user: Summarise the design doc.`, because #7 came after its `from.event`. #9 merges the turn after
#7:

```text
event: CI is green.
user: Summarise the design doc.
assistant: It replaces messages with one event log.
```

The merge is recorded as `stale: { #2: [#7] }`, so the harness knows its answer did not take the notice into account.
