# @dxos/trajectory

An agent conversation stored as an append-only log of immutable `Trajectory.Event` objects in one ECHO feed.
Nothing in the log is ever edited; every view of the conversation is derived from it by a reducer.

- `Trajectory.Event` has `sender` (`role`: `user` | `assistant` | `tool` | `event`, plus optional `identity`,
  `subject`, `name`), optional `thread` and `prev`, `created`, and a tagged `payload`.
- `Reducer.thread` renders the conversation for the UI, `Reducer.session` gives the agent process its state, and
  `Reducer.prompt` builds what is sent to the model.
- Every reducer is a left fold, so `Reducer.run(reducer, tail, checkpoint)` resumes from a saved `Checkpoint` and folds
  only the newer events.

## Sample trajectories

Both samples are built and asserted, output for output, in [`src/samples.test.ts`](src/samples.test.ts).

### 1. A chat turn with a tool call and a prompt typed mid-turn

| #   | sender      | payload                                         |
| --- | ----------- | ----------------------------------------------- |
| 1   | user alice  | `message` "What is the weather in Oslo?"        |
| 2   | assistant   | `promptConsume { message: #1 }`                 |
| 3   | assistant   | `turnBegin { model }`                           |
| 4   | assistant   | `message` toolCall `weather({"city":"Oslo"})`   |
| 5   | user alice  | `message` "And in Bergen?" (typed mid-turn)     |
| 6   | tool        | `message` toolResult "12°C, rain"               |
| 7   | assistant   | `message` "Oslo is 12°C with rain."             |
| 8   | assistant   | `turnEnd { begin: #3, finishReason: 'stop' }`   |
| 9   | assistant   | `promptConsume { message: #5 }` (the next turn) |

`Reducer.prompt` after #8. The follow-up typed during the turn is held back, so the prefix the running turn sent is
never changed:

```text
user: What is the weather in Oslo?
assistant: toolCall
tool: toolResult
assistant: Oslo is 12°C with rain.
```

After #9 the same four lines are followed by `user: And in Bergen?`, which only extends the prompt, so the provider's
prompt cache covers everything sent before.

`Reducer.session` after #8: `queue` is `[#5]` and `turn` is unset. `Reducer.thread` after #9 lists #1, #4, #5, #6 and #7,
with statuses `consumed`, `sent`, `consumed`, `sent`, `sent`.

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
