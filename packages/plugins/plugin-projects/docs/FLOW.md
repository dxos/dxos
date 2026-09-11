# Delegating project tasks to an agent — data flow

Source of truth is the code cited as `path:line`, as of the `task-visualization` branch. Where a
table distinguishes "committed behaviour" from the "parallel change", the latter is that branch's
idempotence guard and `assistant.delegationSpawned` event.

## 1. Overview

A reader checks rows in a project's task list and presses "Assign selected tasks to agent". One
`ProjectOperation.DelegateTaskToChat` call creates a `Chat`, puts the tasks on its checklist, marks
each task `started`/assignee `assistant`/reviewer = the reader, files the chat under the project,
binds skills, opens the chat, and submits an opening prompt. `AgentService` spawns (or reuses) an
`AgentProcess` bound to the chat; the prompt is enqueued on the chat's feed; the process runs a turn
through `AiSession`; after every turn the supervisor `DelegationStrategy` reconciles the checklist,
spawning one `RunInstructions` child process per ready `todo` agent task and folding each child's
exit back into the task status and the feed. Trace events from every process land in the space's
trace feed(s); the chat UI reads the feed, the `TracePanel` reads trace messages plus the process
tree.

```mermaid
sequenceDiagram
  actor User
  participant PA as ProjectArticle
  participant Op as DelegateTaskToChat
  participant ECHO as ECHO (space db)
  participant AS as AgentService / AgentProcess
  participant DS as DelegationStrategy
  participant Sub as RunInstructions (child process)
  participant TR as Trace feed
  participant UI as Chat / TracePanel

  User->>PA: check rows, click delegate-tasks
  PA->>Op: invoke { tasks: Ref[] }
  Op->>ECHO: CreateChat (Feed + Chat + default Binding)
  Op->>ECHO: chat.tasks.push; linkCompanion(project); db.add(chat)
  Op->>ECHO: Task.setStatus('started'), assignee, reviewers, history
  Op->>ECHO: Binding(skills, project) on chat.feed
  Op->>UI: LayoutOperation.Open(project chat path)
  Op->>AS: RunPromptInChat(chat, OPENING_PROMPT)
  AS->>AS: getSession → spawn AgentProcess(target=chat URI)
  AS->>ECHO: feed ← queued user Message
  AS->>TR: AgentRequestBegin … CompleteBlock … AgentRequestEnd
  AS->>ECHO: feed ← assistant Messages (incl. stats block)
  AS->>DS: reconcile(chat, activeIds)
  DS->>ECHO: sweep started/no-process → failed; todo+ready → started
  DS->>Sub: invokeFiber(RunInstructions) → pid
  AS->>TR: DelegationSpawned {taskId, pid} (parallel change)
  Sub->>ECHO: own Feed; CompleteBlock events (parentPid = agent pid)
  Sub-->>AS: onChildEvent(exited)
  AS->>DS: onComplete(chat, taskId, exit)
  DS->>ECHO: task.status = done|failed; feed ← notification Message
  UI-->>User: chat renders feed; TracePanel renders spans + process tree
```

## 2. Step-by-step

### 2.1 Checked set → operation

| Step                       | Where                                                                                       | What                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Checkbox toggles           | `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:155-165`    | `useSelection(taskSet.id, 'multi')` from `react-ui-attention`; keyed by the task set's id. Checkboxes render only when some plugin contributes `TasksCapabilities.TaskAction`. |
| Toolbar reads the same set | `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:273-310` | `useCheckedTasks` re-queries `Filter.childOf(taskSet)` and orders by the tree walk, so the handed-over list is in reading order, not tick order.                               |
| `delegate-tasks` action    | `ProjectArticle.tsx:357-375, 402-412`                                                       | One invocation for the whole set: `DelegateTaskToChat { tasks: Ref[] }` with `{ spaceId }`; then `clear()` the selection. Disabled when the set is empty.                      |
| Row action                 | `packages/plugins/plugin-projects/src/capabilities/task-action.ts:17-25`                    | `delegate-to-chat` ("Assign to agent") invokes the same operation with a one-element list.                                                                                     |

### 2.2 `DelegateTaskToChat` — writes

`packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts`

| Order | Write                                                               | Line             | Detail                                                                                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | load tasks; resolve project                                         | 51, 68-75        | Project found by walking ECHO parents (`findProject`). More than one project → invariant failure, nothing written.                                                                                                                                                                                                       |
| 2     | `CreateChat`                                                        | 77-81            | `packages/plugins/plugin-assistant/src/operations/create-chat.ts:31-64`: `db.add(Feed)`, `Chat.make({ feed })`, and a default `AiContext.Binding` appended to the feed (Assistant, Database, ChatContext, SkillManager, Alarm, Planning skills; `objects: [chat]`). Named after the task only when there is exactly one. |
| 3     | `chat.tasks.push(refs)`                                             | 85-87            | Direct push — **not** `Chat.assignTasks` (`Chat.ts:122-138`), so no de-duplication. The field is non-owning (`Chat.ts:43-50`); tasks keep their task-set parent.                                                                                                                                                         |
| 4     | `Chat.linkCompanion({ chat, subject: project })`                    | 91-93            | `Chat.ts:82-98`: appends `Ref(chat)` to `CompanionChatAnnotation` on the project and `Obj.setParent(chat, project)`.                                                                                                                                                                                                     |
| 5     | `db.add(chat)`                                                      | 98               | Chat becomes durable in the space.                                                                                                                                                                                                                                                                                       |
| 6     | per task: `Task.setStatus(task, 'started', { actor: reviewer })`    | 106-107          | `Task.ts:438` → `update` (`Task.ts:345-435`): sets `status`, pushes one `HistoryEntry { date, actor, event:'updated', description:'Status changed from todo to started.' }`.                                                                                                                                             |
| 7     | per task: `assignee = { role:'assistant' }`, `reviewers = [reader]` | 108-116          | Bare role by design: `delegation-strategy` matches on `assignee.role`. `reviewers` non-empty is what later turns `done` into `review`.                                                                                                                                                                                   |
| 8     | `bindDelegationContext`                                             | 119, 212-221     | Second `Binding` appended to the feed: skills `planning`, `markdown`, `project`, `sandbox` (registry refs; unresolvable keys drop silently) and `objects: [project]`.                                                                                                                                                    |
| 9     | `Database.flush()`                                                  | 120              | Everything above is durable before the UI moves.                                                                                                                                                                                                                                                                         |
| 10    | `LayoutOperation.Open`                                              | 132-135, 163-169 | Path from `getProjectChatPath(spaceId, project.id, chat.id)`, `navigation:'immediate'`. Best-effort (`Effect.exit`, logged).                                                                                                                                                                                             |
| 11    | `RunPromptInChat { chat, prompt: OPENING_PROMPT }`                  | 137-143          | Best-effort. `OPENING_PROMPT` (183-188) references the checklist rather than restating it.                                                                                                                                                                                                                               |

Steps 1-9 are the durable delegation; 10-11 are UI/runtime conveniences. A host without layout or
agent runtime still ends with a chat carrying started tasks.

### 2.3 `RunPromptInChat` → `AgentService.getSession` → `AgentProcess`

| Step                               | Where                                                                           | What                                                                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activate assistant, resolve preset | `packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:29-56`  | `getSession(chat, { model, provider, location: chat.remote ? 'edge' : 'local' })`, then `session.submitPrompt(prompt)`.                                                                                                                                                                      |
| Find or spawn the process          | `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:317-350` | Lists `{ target: Obj.getURI(chat), key: AGENT_PROCESS_KEY }`; reuses a non-terminal process, else spawns. Serialized per chat id (`lockFor`, 235-241).                                                                                                                                       |
| Spawn options                      | `AgentService.ts:336-350`                                                       | `name:'Agent'`, **`target = chat URI`** (→ `Process.TargetAnnotation`), `HarnessHostAnnotation = true`, `environment { space, conversation: feed URI }`, `traceMeta { conversation: Ref(feed) }`. No `parentProcessId` — the agent is a root process.                                        |
| Process key                        | `agent-process.ts:94`                                                           | `org.dxos.testing.process.agent`.                                                                                                                                                                                                                                                            |
| Boot                               | `agent-process.ts:140-149`                                                      | Reads `TargetAnnotation`, `Database.resolve(chatDxn, Chat)`, loads `chat.feed`, `chat.instructions`.                                                                                                                                                                                         |
| `submitPrompt` → `onInput`         | `agent-process.ts:365-372`                                                      | Appends a `Message { sender:{role:'user'} }` to the feed with the queued annotation (`SessionStore.enqueueMessage`, `packages/core/compute/assistant/src/session/SessionStore.ts:183-186`), then `ctx.setAlarm(0)`.                                                                          |
| `onAlarm` → turn                   | `agent-process.ts:373-535`                                                      | Dequeues; `markInFlight` (472); `Trace.write(AgentRequestBegin)` (477); `session.runTurn` (478-491) → `AgentRequestEnd { status: success\|error\|interrupted }`; `ack` (501); then supervisor reconcile (507-521); then `maybeCompleteWith` → `ctx.succeed()` when nothing is pending (324). |
| Turn output                        | `packages/core/compute/assistant/src/request/AiRequest.ts:201-220, 399-405`     | Every complete block becomes a `Message { sender:{role:'assistant'}, blocks:[block] }` appended to the feed via `AiSession.appendTurnMessage` (`AiSession.ts:174-186`), and a `CompleteBlock` trace event per block. Partial blocks are ephemeral `PartialBlock` events only.                |

### 2.4 Supervisor reconcile

`packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts`, called from
`agent-process.ts:509-521` after each turn and `agent-process.ts:557-568` after each child exit.
The strategy is contributed unconditionally by plugin-assistant
(`packages/plugins/plugin-assistant/src/capabilities/skill-definition.ts:57`, consumed at
`capabilities/agent-service.ts:39-46`).

| Step                                  | Line                       | Write                                                                                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sweepOrphanedTasks(chat, activeIds)` | 91-110                     | Every checklist task with `assignee.role === 'assistant' && status === 'started'` whose id is not in `activeIds` → `status = 'failed'` (direct `Obj.update`, no history entry), then flush.                                                                             |
| `findPendingTasks`                    | 71-85                      | `assignee.role === 'assistant' && (status ?? 'todo') === 'todo' && !activeIds.has(id) && Task.isTaskReady(tasks, task)`.                                                                                                                                                |
| inherited skills                      | 131-137                    | Supervisor's bound skills minus `DelegationSkill`, read from the feed's bindings.                                                                                                                                                                                       |
| per pending task                      | 143-178                    | `Database.add(Instructions { name: task.title, text, skills })`; `task.status = 'started'` (direct `Obj.update`, no history); `Delegation { id: task.id, spawn }`.                                                                                                      |
| spawn                                 | `agent-process.ts:512-516` | `invoker.invokeFiber(RunInstructions, { instructions: Ref, input: {} })` → child pid; `delegations.push({ pid, id })`; `DelegationsCell.set` (KV under `process/<agentPid>/delegations`, 661-664); `Trace.write(DelegationSpawned, { taskId, pid })` (parallel change). |

`activeIds` is the set of task ids in the in-memory `delegations` array, seeded from the KV cell at
boot (`agent-process.ts:217`). The cell is scoped to the process id, so a fresh process starts empty.

### 2.5 Sub-agent process

`packages/core/compute/compute-runtime/src/ProcessOperationInvoker.ts:150-190` and
`packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts`.

| Property      | Value                                                                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| key           | `org.dxos.operation.assistantToolkit.runInstructions` (operation process via `Process.fromOperation`)                                                                                                                                                                                                                           |
| `name`        | `Run Instructions (org.dxos.operation.assistantToolkit.runInstructions)` (`ProcessOperationInvoker.ts:172`)                                                                                                                                                                                                                     |
| `parentPid`   | the agent pid (`ProcessOperationInvoker.ts:171`; the invoker in the agent's context carries `parentProcessId`, `ProcessManager.ts:586-593`)                                                                                                                                                                                     |
| annotations   | none from the strategy; no `TargetAnnotation`                                                                                                                                                                                                                                                                                   |
| `environment` | inherited from the parent (`ProcessManager.ts:517-520`): `{ space, conversation: <supervisor feed URI> }`                                                                                                                                                                                                                       |
| trace meta    | `pid`, `parentPid`, `processName` set by `createProcessTraceService` (`process-trace.ts`); **`conversation` absent** — the strategy passes no `traceMeta`, and meta is not derived from `environment`                                                                                                                           |
| feed          | a **new unparented `Feed`** in the space (`run-instructions.ts:98-105`), because the strategy passes no `chat`. Its messages are not in the chat's feed.                                                                                                                                                                        |
| trace events  | `OperationStart { key, name:'Run Instructions' }` / `OperationEnd` (`packages/core/compute/compute/src/Process.ts:403-407`), `CompleteBlock` per block, `RequestPhase`. `OperationStart.name` is the operation's `meta.name`, **not the task title**; the task title is only on the `Instructions.name` object the child loads. |
| exit          | `completeJob` tool resolves the deferred (`run-instructions.ts:106-112, 177-190`); the linked child's exit wakes the parent's `onChildEvent`.                                                                                                                                                                                   |

### 2.6 Completion

`agent-process.ts:541-570` → `delegation-strategy.ts:184-237`:

| Write                                                                                   | Line                       | Detail                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delegations` minus this pid; `DelegationsCell.set`                                     | 548-549                    | The task id leaves `activeIds`.                                                                                                                                            |
| `task.status = Exit.isSuccess ? 'done' : 'failed'`                                      | ds 194-196                 | Direct `Obj.update`: **bypasses `Task.update`/`finishStatus`**, so a task with reviewers goes straight to `done`, never `review`; no history entry.                        |
| `Feed.append(chat.feed, [Message { sender:'assistant', blocks:[text, ...reference] }])` | ds 224-236                 | Notification text `The sub-agent completed "<title>". …` or `… failed to complete "<title>": <errors>`; artifact ids reported via `completeJob` become `reference` blocks. |
| re-reconcile                                                                            | `agent-process.ts:559-568` | Dependents whose `dependsOn` are now `done` spawn without a new prompt.                                                                                                    |
| `maybeComplete`                                                                         | 570                        | Process succeeds when nothing is queued, no delegations are live, no tool calls are pending.                                                                               |

## 3. Join keys

| From                                                   | To      | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Trace.Message.meta.conversation` (`Trace.ts:105-119`) | feed    | It is `Ref(feed)`, set from `traceMeta` at spawn (`AgentService.ts:349`; hooks at `agent-process.ts:240`). Filterable by DXN string (`Trace.ts:200-206, 287`).                                                                                                                                                                                                                                                                                                                                                                                               |
| feed                                                   | `Chat`  | `Chat.loadForFeed` (`Chat.ts:201-219`): parent edge first (`chat.feed` is `SetParent`), fallback scan of `Filter.type(Chat)` by `feedEntityId`.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Chat`                                                 | tasks   | `chat.tasks: Ref<Task>[]` (`Chat.ts:50`); `Chat.loadTasks` / `resolveTasks` (`Chat.ts:242-253`) de-dupe.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Chat`                                                 | project | `Chat.peekProject` (`Chat.ts:230-239`) walks parents; inverse is `CompanionChatAnnotation` on the project.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| agent `Process.Info`                                   | `Chat`  | `Process.TargetAnnotation` = **chat URI** (`AgentService.ts:318, 338`; read at `agent-process.ts:140`). `Monitor.list({ target, key })` (`Process.ts:527, 554`).                                                                                                                                                                                                                                                                                                                                                                                             |
| agent `Process.Info`                                   | feed    | `info.environment.conversation` = feed URI (`AgentService.ts:346`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| sub-agent `Process.Info`                               | agent   | `info.parentPid` (`Process.ts:573`). `environment.conversation` is inherited, so it also names the supervisor's feed.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| sub-agent `Process.Info`                               | task    | **Runtime-side only**: `DelegationsCell` / in-memory `delegations` in the agent process (`agent-process.ts:217, 512-517, 661-664`) — not readable from the client. `OperationStart.name` is `Run Instructions`, so it is not a fallback; the child's `Instructions.name` equals the task title but the instructions ref is only in the child's input (ephemeral `OperationInput`). The `assistant.delegationSpawned { taskId, pid }` durable event (`tracing.ts:53-59`, written at `agent-process.ts:516, 565`) is the parallel change that closes this gap. |
| sub-agent trace events                                 | chat    | `meta.parentPid` → agent pid → agent's `meta.conversation` or `TargetAnnotation`. Not directly: `meta.conversation` is unset on sub-agent events.                                                                                                                                                                                                                                                                                                                                                                                                            |
| token counts                                           | —       | Per turn: `ContentBlock.Stats { usage: { inputTokens, outputTokens, totalTokens }, model, toolCalls, duration }` (`packages/sdk/types/src/types/ContentBlock.ts:195-216`), produced by `AiParser.ts:428-443` and landing both as a feed `Message` block and as a `CompleteBlock` trace event (`AiRequest.ts:399-405, 214`). `Process.Info.metrics` is `{ wallTime, inputCount, outputCount }` only (`Process.ts:613-628`) — no tokens.                                                                                                                       |

## 4. Task state machine

Statuses: `todo | backlog | started | review | done | duplicate | blocked | cancelled | failed`
(`packages/sdk/types/src/types/Task.ts:57-67`). Only the transitions below are written by this
flow.

| Transition                 | Writer                                                                     | Via                                                                                                                                                                                                         | History entry   |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `todo → started`           | `DelegateTaskToChat`                                                       | `Task.setStatus(task,'started',{actor: reader})` (`delegate-task-to-chat.ts:107`)                                                                                                                           | yes, with actor |
| `todo → started`           | supervisor reconcile                                                       | direct `Obj.update` (`delegation-strategy.ts:162-164`)                                                                                                                                                      | no              |
| `started → failed`         | `sweepOrphanedTasks`                                                       | direct (`delegation-strategy.ts:103-108`) — any `assistant`-assigned `started` task not in `activeIds`                                                                                                      | no              |
| `started → done \| failed` | `onComplete`                                                               | direct (`delegation-strategy.ts:194-196`) — ignores reviewers                                                                                                                                               | no              |
| `* → review`               | any `Task.update`/`setStatus` asking for `done` on a task with `reviewers` | `finishStatus` (`Task.ts:335-336`) — planning `UpdateTasks` (`skills/planning/operations/update-tasks.ts:33`), tasks `UpdateTask` (`plugin-tasks/src/operations/update-task.ts:51`), the row's own checkbox | yes             |
| `review → done`            | reviewer                                                                   | `Task.approve` (`Task.ts:445-446`) only                                                                                                                                                                     | yes             |
| `todo` (assigned)          | delegation skill verbs                                                     | `delegate-task.ts:33-34`, `delegate-tasks.ts:58-64` set `assignee` + `todo`; `started`/`done`/`cancelled` are skipped                                                                                       | no              |

Gating: `Task.isTaskReady` (`Task.ts:557-564`) — every `dependsOn` resolved within the checklist
must be `done`; a dangling ref reads as satisfied. There is no automatic write of `blocked`; it is
a manual status. `Task.isAgentWorking` (`Task.ts:551`) = `assignee.role === 'assistant' &&
status === 'started'`, and drives the spinner glyph
(`packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:44`).

Observed consequence (no code path prevents it): a task delegated through this flow arrives at the
first reconcile as `started`/`assistant` with an empty `activeIds`, so `sweepOrphanedTasks` marks
it `failed` unless the opening turn already moved it to `review`/`done`. `findPendingTasks` never
sees it either, since it only spawns `todo` tasks. See §7.

## 5. Idempotence

| Case                                                                       | Committed behaviour                                                                                                                                                                                                                                                                                                                                                                                            | Parallel change                                                                                                                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double click on `delegate-tasks`                                           | Two invocations. Each creates its own Chat, pushes the same task refs, re-runs `setStatus('started')` (no-op on status, so no history entry, `Task.ts:343-345`), rewrites `assignee`/`reviewers`, appends two `CompanionChatAnnotation` refs, submits two opening prompts. Two agent processes. The selection is cleared after the first `await`, but the click handler reads `checkedTasks` from its closure. | `ProjectArticle.tsx:352-375` holds a `delegating` state that disables the action for the whole invocation.                                                                         |
| Re-delegating an already-started task (row action, or a later checked set) | Same as above: a second chat holds the same task; the first chat's supervisor still sees it on its checklist. `DelegateTaskToChat` has no guard at HEAD.                                                                                                                                                                                                                                                       | `delegate-task-to-chat.ts:54-57` filters `Task.isAgentWorking` tasks out and fails the invariant if nothing is left; `ProjectArticle.tsx:307` filters them from the toolbar's set. |
| Re-delegating via the delegation skill verbs                               | `delegate-tasks.ts:58-64` skips `started` tasks explicitly.                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                                                                  |
| Duplicate refs on one checklist                                            | `chat.tasks.push` does not de-dupe; `Chat.loadTasks` de-dupes on read (`Chat.ts:242-249`).                                                                                                                                                                                                                                                                                                                     | —                                                                                                                                                                                  |
| `RunPromptInChat` twice                                                    | `getSession` reuses the live process for the chat (`AgentService.ts:327-334`); each call enqueues one more queued `Message`, processed in order.                                                                                                                                                                                                                                                               | —                                                                                                                                                                                  |
| Process reload                                                             | A fresh `AgentProcess` starts with an empty `DelegationsCell` (KV is per pid) and `onSpawn` acks any queued prompts left by the previous process (`agent-process.ts:333-342`); children of the old process are terminated with it. Next reconcile sweeps every `started` agent task to `failed`.                                                                                                               | —                                                                                                                                                                                  |

What the UI can read to know a session is running for a project:

| Signal                                                                                                                                       | Source                                                      | Semantics                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Task.isAgentWorking(task)`                                                                                                                  | ECHO                                                        | "Delegated and not yet finished". Durable, survives reloads, but says nothing about a live process — stale after a crash until the next reconcile fails it.                    |
| `ProcessMonitor.processTreeAtom` filtered by `key === AGENT_PROCESS_KEY` and `TargetAnnotation === chat URI`, state `RUNNING \| HYBERNATING` | `Process.ts:506, 527-560`; used by `TracePanel.tsx:300-341` | "A process for this chat exists right now". Local runtime only unless the aggregate monitor spans edge. To get from project to chat: `CompanionChatAnnotation` on the project. |
| `session.running` / `processor.active`                                                                                                       | `AgentService.ts:431-436`; `processor.ts:222, 340, 393`     | Per open chat; what `Chat.tsx:98` renders.                                                                                                                                     |
| children of the agent pid with `parentPid === agentPid`                                                                                      | process tree                                                | Live sub-agents; the task they serve is not readable client-side (see §3).                                                                                                     |

## 6. Stopping a session — options

Context: the chat's `cancel` button (`packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:279-281`)
calls `processor.cancel()` (`processor.ts:547-564`), which interrupts the request fiber **and
terminates the agent process** (`session.terminate()` → `ProcessHandle.terminate`,
`ProcessHandle.ts:316-338`), which cascades to non-terminal children
(`ProcessManager.ts:429-438`, wired at `686`). So (a) below is not what the UI does today; (b) is.

| Option                                                | Runtime                                                                                                                                                                 | ECHO after                                                                                                                                                                                                           | User sees                                                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| (a) Interrupt the current turn only, keep the process | Interrupt the turn fiber; process stays resident. Needs a new RPC — `HarnessControl` has `setAlarm`/`enqueueMessage` only (`agent-process.ts:345-364`).                 | Feed: partial turn discarded (ephemeral); queued entry stays pending and is redelivered on the next wake. Tasks untouched.                                                                                           | Turn stops; sub-agents keep running; next prompt continues the session.                                                            |
| (b) Terminate the agent process, leave tasks          | `processor.cancel()` today. `AgentRequestEnd { status:'interrupted' }` is written by `onExit`; children terminated; `DelegationsCell` orphaned.                         | Tasks stay `started`/`assistant` — spinner keeps spinning. Next prompt spawns a fresh process whose first reconcile sweeps them to `failed` (no history, no notification message for the sweep — only a `log.warn`). | Chat goes idle; rows look busy until someone prompts again, then flip to `failed`.                                                 |
| (c) Terminate + revert tasks to `todo` + unassign     | (b) plus, per task on the chat's checklist with `isAgentWorking`: `Task.update(task, { status:'todo', assignee:null }, { actor })` and optionally `Chat.unassignTasks`. | Tasks back to their pre-delegation shape with a history entry; chat keeps its transcript. `reviewers` would need clearing too (not part of `Task.Edit`).                                                             | Rows return to plain `todo`; can be re-delegated immediately.                                                                      |
| (d) Terminate + mark `failed`/`cancelled` with a note | (b) plus `Task.setStatus(task, 'cancelled', { actor })` and a feed `Message` explaining the stop.                                                                       | Terminal status with actor and history; sweep has nothing to do.                                                                                                                                                     | Rows show a deliberate stop rather than a crash; re-delegation requires resetting status first (delegation verbs skip non-`todo`). |

Suggested: (c) for a user-initiated stop from the project view (the rows are the working surface
and should read as "not started"), (d) only when the stop is meant to record an outcome. Either way
the write should go through `Task.update` so history records who stopped it — the sweep's direct
write is the crash path, not the intended one.

## 7. Open questions / gaps

1. **`started` on delegation vs. the orphan sweep.** `DelegateTaskToChat` stamps `started`
   (`delegate-task-to-chat.ts:104-107`, #12847) while the strategy defines `started` as "has a
   live sub-agent" and fails anything else (`delegation-strategy.ts:64-69, 87-110`, #12752).
   As read, the first post-turn reconcile fails every delegated task the opening turn did not
   finish. Either the sweep must exclude tasks not spawned by this process (e.g. only fail ids
   this process ever put in `delegations`), or the operation must leave tasks `todo` and let
   reconcile spawn them — which changes the model from "the chat works the tasks in-turn" to "one
   sub-agent per task".
2. **Two paths do the work.** The opening prompt asks the chat's own turn to work the tasks
   sequentially (`OPENING_PROMPT`), while the supervisor would spawn a sub-agent per `todo` agent
   task. Only one can own a task's status; today the sub-agent path is dead for delegated tasks
   (they are never `todo`), so the "sub-agent → task" join in §3 is moot for this flow until (1)
   is resolved.
3. **`onComplete` bypasses `finishStatus`.** A sub-agent finishing a reviewed task writes `done`
   directly (`delegation-strategy.ts:194-196`), never `review`, and writes no history.
4. **TracePanel label lookup is stale.** `resolveLabel` matches `TargetAnnotation` against chat
   _feed_ entity ids (`TracePanel.tsx:317-341`), but the annotation has been the _chat_ URI since
   #12904 (`AgentService.ts:318`). Agent processes therefore render unlabelled.
5. **Sub-agent trace events carry no `conversation`.** The strategy's `invokeFiber` passes no
   `traceMeta` (`delegation-strategy.ts:172-175`); only `parentPid` links them.
6. **Sub-agent transcripts are orphan feeds.** `RunInstructions` creates a fresh `Feed` with no
   parent (`run-instructions.ts:104`); nothing cascades or lists them.
7. **`process.spawned` / `process.exited` events are declared but not written**
   (`Process.ts:634-650`; no writer under `compute-runtime/src`). Process lifecycle is visible
   only via the process tree, not the trace feed.
8. **`useProcessEphemeralStatus`** (`plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:84`)
   takes an agent pid and walks its children, but has no caller in `src/`; the task row has an
   `active` override (`TaskRowCells.tsx:29-33`) that nothing supplies.
9. **`AGENT_PROCESS_KEY` is `org.dxos.testing.process.agent`** (`agent-process.ts:94`) — a
   testing namespace for the production key.
10. **`Chat.tasks` push without `assignTasks`** (`delegate-task-to-chat.ts:85-87`) leaves
    duplicate refs possible; read-side de-dupe hides it.
