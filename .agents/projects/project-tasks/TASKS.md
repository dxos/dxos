# Project Tasks — Tasks

_Resume: push, CI, PR comments, DESIGN.md (assistant-toolkit/docs). Uncommitted: none. Last: Phase 2 complete — live drain verified 3/3 done, no duplicates, no JSON failures._

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
- [ ] **Atomic task-set initialization** — `ensureTaskSet` creates the set and
      writes the owner ref in separate operations, so concurrent peers can race
      and orphan a set (CodeRabbit on #12752); needs a create-if-absent
      primitive or a reconcile that adopts the losing set's tasks.
- [ ] **Data-flow dependencies** — `dependsOn` is scheduling-only today: a
      sub-agent receives just its task title, so a dependent task cannot
      consume a predecessor's result. Render completed dependencies' results
      (held by the supervisor from fold-back exits) into the dependent
      sub-agent's synthesized instructions.
- [x] **Slash commands** — /task:create, /task:run, /task:delete shipped:
      client-side execution via shared primitives (TaskSet.addTask/deleteTask,
      ensureTaskSetSync), `/` completion (non-cycling, mono command column,
      grid popover) + atomic dx-tag decoration in the prompt editor; /task:run
      wakes the conversation with a scoped follow-up. Live-verified.
- [ ] **Bind slash commands to operation invocations** — needs a client-side
      harness bridge: harness-scoped operations (HarnessService) resolve their
      services only inside the agent session, so the UI invoker's
      DynamicRuntime cannot invoke them; also record command + result as feed
      messages so the transcript reflects command activity.
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

- [x] **Task.dependsOn** — optional array of suspended self-refs; ready = all
      deps done.
- [x] **Numbered checklist** — `formatChecklist` renders ordinals + dependency
      notes so model and UI share numbering.
- [x] **delegateTasks verb** — input array of (ordinal | title), resolved
      server-side; stamps agent assignee; reconcile spawns; spawn sets
      `started`; onComplete marks done/failed; sweep marks orphaned started
      agent tasks failed (no zombies).
- [x] **Calculator skill (stories-assistant)** — local `compute(expression)`
      operation so sub-agents demonstrably call a local tool.
- [x] **TaskList ordinals + spinner** — index column; `animate-spin` spinner
      icon when status started && assignee assistant.
- [x] **Executable seeds + stories** — A/B/C seeds (B<-A, C<-B); scripted
      TestTaskExecution/TestTaskDelegation/TestTaskDrain (CI) + live
      WithTaskDrain; stories reordered demos-first with Test-prefixed play
      stories last. Fixes en route: agent-runtime re-reconciles after each
      delegation exits (the drain was one-spawn-per-turn without it);
      completeJob back to dynamic/typed-union schema after the live JSON
      digit-separator failure recurred under main's non-strict Schema.Any;
      checklist notes moved off the title line (models pasted them back into
      title-keyed upserts, duplicating tasks). Live drain verified: 3/3 done,
      3 fold-backs, no duplicates, no failures.
- [ ] **Finish** — fixtures regen, suites, lint/format, live verify, changeset,
      push, PR comments (at end), DESIGN.md in assistant-toolkit/docs.

## Phase 3: Task UX backlog

Follow-ups raised while reviewing the TaskList and chat surfaces (2026-08-26).
Each is independent of the others; none is started.

### Tasks

- [ ] **Hierarchical tasks in the list** — render sub-tasks under their parent.
      The model already carries it (`Task.parentTask`, `TaskSet.rootTasks` /
      `subTasks` derive the tree from the flat `tasks` array), so this is a
      `TaskList` concern: indentation, collapse/expand, and what an ordinal
      means for a child. Decide whether the agent may nest (an `UpdateTasks`
      field) or only the UI can.
- [ ] **Assign a TaskSet to a chat** — a user-facing action that points
      `Chat.taskSet` at an existing set (picker/command), rather than the chat
      lazily creating its own. Distinct from the automatic stamping item in
      Phase 1 (project chats adopting the project's ledger): this is the manual
      override, and it needs to say what happens to tasks already in the chat's
      own set.
- [x] **Option to show the task description in the list** — `TaskList.Root`
      gains `showDescriptions`; a described row grows (`auto-rows-min`) and every
      other cell is pinned to the title's line, since a row is its own subgrid
      and the listbox item centres its cells by default. Off by default, so the
      chat strip stays one row per task. `WithDescriptions` story added.
- [ ] **ProjectArticle tabs** — tabbed surface for the project article
      (plugin-projects) instead of the current stacked sections.
- [ ] **`#foo` renders as a heading in chat markdown** — a `#` inside a message
      is parsed as an ATX heading, so `#foo` comes out as a title. Reproduce and
      fix in whichever renderer the thread uses (`MarkdownView` wraps
      react-markdown + remark-gfm; editor-backed surfaces go through
      `decorateMarkdown`), then linkify issue references intelligently: `#123`
      becomes a link to the PR/issue in the relevant repo, with the repo
      resolved from context rather than hard-coded.
- [ ] **Autolink bare URLs in chat markdown** — a naked `https://…` in a message
      should render as an anchor, not plain text. remark-gfm's autolink literal
      covers the common case, so first establish whether the thread renders
      through that path at all.
