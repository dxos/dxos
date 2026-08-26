# Project Tasks — Tasks

_Resume: Phase 2 build (see below). Uncommitted: none. Last: merged main (its completeJob strict fix adopted + JSON-guard prompt line, live-verified 2/2); key at .secrets/anthropic.env._

## Phase 1: Agent delegation over durable tasks

Agent delegation and TaskSet-backed task management — make the delegation loop
(supervisor → durable Task in a TaskSet → sub-agent → fold-back) work live and
be visible in the UI, closing the gaps the storybook audit surfaced.

### Tasks

- [x] **Audit storybooks for delegation + TaskSet coverage** — delegation:
      Chat `WithSubAgents`/`Test1`/`Test2` (stories-assistant), TaskList
      `WithDelegatedAgent`, TracePanel `WithSubAgentFixture`; TaskSet:
      TaskSetArticle `Default`/`Behavior`, ProjectArticle `Default`/`Sections`/
      `Updates`. Gap: no story joins the two (delegation visible in a TaskSet
      surface).
- [x] **Fix live delegation dying at the sub-agent's first model call** — the
      Anthropic API rejects `{}`/typeless tool subschemas; `completeJob` for an
      undeclared routine output serialized `Schema.Any` to `{}`, and the
      provider's structured-output transformer rewrote Record/ObjectKeyword
      back into typeless nodes. Final fix: `completeJob` is a `Tool.dynamic`
      whose JSON schema reaches the provider verbatim; handler decodes against
      the same schema. Regression test walks the serialized schema for typeless
      nodes under both serialization paths.
- [x] **Stop posting stack traces into the conversation** — `onComplete` posts
      only `Cause.prettyErrors` messages; full pretty cause stays in `log.warn`.
      Scripted failure-path test added.
- [x] **Replace Chat.outline with Chat.taskSet** — the chat's working surface is
      the durable task set: `ensureTaskSet`/`peekTaskSetRef`/`loadTasks`/
      `formatChecklist` (renders tasks as checklist markdown for prompts);
      UpdateTasks upserts durable tasks by title; DelegateTask files into the
      conversation's set (standalone chats now delegate into their own);
      the delegation strategy no longer mirrors to markdown; ChatTaskList and
      the ChatArticle story read/seed the task set.
- [ ] **Open PR** — delegation fix + shared TaskList consolidation +
      Chat.taskSet pivot; add an assistant-toolkit changeset.
- [ ] **Joined story: delegation beside a TaskSet surface** — chat delegating
      while a `TaskSetArticle` (or ChatTaskList over the durable TaskSet) shows
      the agent task appear, run, and complete.
- [ ] **Promote-task verb** — outside delegation the agent still cannot create
      a durable Task (carried from plugin-projects; delegation is currently the
      only promotion path).
- [ ] **Set taskSet for Chat objects that are children of Projects** — stamp
      `chat.taskSet` with the project's set when the chat is parented, instead
      of resolving through the parent walk at read time (`peekProject`), so the
      ref is durable and the UI needs no reactive parent lookup (closes the
      TODO on `ChatTaskList`).
- [ ] **Show task status, dependencies, and trigger sub-agents from task list**
      — surface per-task run state (started/failed, active sub-agent) and
      inter-task dependencies in the TaskList UI, and let a task row launch a
      sub-agent directly (the delegation loop without going through chat).
- [ ] **Cancel/delete tasks** — cancel a started (possibly delegated) task from
      the UI and the agent surface, and delete via the TaskOperation verb so
      the set's refs and lifecycle parent edges stay consistent; a cancelled
      delegated task should also interrupt its sub-agent process.

### References

- Delegation strategy: `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts`
- RunInstructions/completeJob: `packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts`
- Tool projection pattern (verbatim schema rationale): `packages/core/compute/assistant/src/tool-runtime/services.ts` (`projectFunctionToTool`)
- Stories: `packages/stories/stories-assistant/src/stories/Chat.stories.tsx`
- Related project: `plugin-projects` (registry) — task model, delegation-as-promotion

## Phase 2: Task execution and delegation demos

Demonstrate the assistant tracking tasks and delegating sub-agents over them.
All decisions user-approved 2026-08-25; scripted stories in CI, live twin for
the drain loop; this PR (#12752).

### Tasks

- [ ] **Task.dependsOn** — optional array of suspended self-refs; ready = all
      deps done.
- [ ] **Numbered checklist** — `formatChecklist` renders ordinals + dependency
      notes so model and UI share numbering.
- [ ] **delegateTasks verb** — input array of (ordinal | title), resolved
      server-side; stamps agent assignee; reconcile spawns; spawn sets
      `started`; onComplete marks done/failed; sweep marks orphaned started
      agent tasks failed (no zombies).
- [ ] **Calculator skill (stories-assistant)** — local `compute(expression)`
      operation so sub-agents demonstrably call a local tool.
- [ ] **TaskList ordinals + spinner** — index column; `animate-spin` spinner
      icon when status started && assignee assistant.
- [ ] **Executable seeds + stories** — A/B/C seeds (B<-A, C<-B); scripted:
      execute-first, delegate-first, drain-loop (deps-ordered); live twin of
      the drain loop.
- [ ] **Finish** — fixtures regen, suites, lint/format, live verify, changeset,
      push, PR comments (at end), DESIGN.md in assistant-toolkit/docs.
