# Project Tasks — Tasks

_Resume: #12787 MERGED 2026-08-27 — the hierarchical TaskList with drag-and-drop. Uncommitted: none. Next: pick from the Phase 3 backlog._

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
- [x] **Open PR** — #12752 (delegation fix, shared TaskList, Chat.taskSet pivot)
      merged 2026-08-26; the follow-on work is #12784.
- [ ] **Joined story: delegation beside a TaskSet surface** — chat delegating
      while a `TaskSetArticle` (or ChatTaskList over the durable TaskSet) shows
      the agent task appear, run, and complete.
- [ ] **Promote-task verb** — outside delegation the agent still cannot create
      a durable Task (carried from plugin-projects; delegation is currently the
      only promotion path).
- [x] **Chat holds Task refs, not a TaskSet ref** — `Chat.taskSet` is replaced
      by `Chat.tasks: Ref<Task>[]` (the shape `TaskSet.tasks` has), owned via
      `SetParent`. `ensureTaskSet`/`ensureTaskSetSync`/`peekTaskSetRef` are gone
      along with the lazy create-then-link race; `Chat.addTask`/`deleteTask` are
      the write primitives and `resolveTasks` the sync read. `ChatTaskList` reads
      `chat.tasks` directly, closing its parent-walk TODO. This supersedes both
      "Set taskSet for Chat objects that are children of Projects" and "Atomic
      task-set initialization". Consequence: a project's chats no longer share
      one ledger — see the new follow-up below.
- [ ] **Surface a project's chat checklists** — now that a project chat's tasks
      live on the chat, `Project.taskSet` no longer accumulates what its
      conversations produced. Decide whether the project view aggregates its
      chats' `tasks` or whether promotion into `Project.taskSet` becomes an
      explicit verb.
- [ ] **Trigger sub-agents from the task row** — status, dependencies and the
      spinner all render; what is left is starting a delegation from the row
      itself rather than through `/task:run` — the delegation loop without going
      through chat. (Was: "show status, dependencies, and trigger sub-agents".)
- [x] **Atomic task-set initialization** — moot: there is no lazy set to create.
      `Chat.tasks` starts as an empty array in `Chat.make`, so the first recorded
      task is one array append with nothing to race.
- [ ] **Data-flow dependencies** — `dependsOn` is scheduling-only today: a
      sub-agent receives just its task title, so a dependent task cannot
      consume a predecessor's result. Render completed dependencies' results
      (held by the supervisor from fold-back exits) into the dependent
      sub-agent's synthesized instructions.
- [x] **Slash commands** — /task:create, /task:run, /task:delete shipped:
      client-side execution via shared primitives (now Chat.addTask/deleteTask),
      `/` completion (non-cycling, mono command column,
      grid popover) + atomic dx-tag decoration in the prompt editor; /task:run
      wakes the conversation with a scoped follow-up. Live-verified.
- [x] **Bind slash commands to operation invocations** — no harness bridge was
      needed: the task verbs declare only `Database.Service`, so the UI invoker
      can call them (as `TaskSetArticle` already did). The commands moved to
      plugin-assistant (a core package cannot reference a plugin's operations)
      and now invoke `CreateTask`/`DeleteTask`/`UpdateTask`; `/task:run` queues
      through `UpdateTask` and the supervisor's reconcile still spawns. Both the
      command and its result are appended to the feed, so the transcript records
      what ran. `assistant-toolkit` keeps the contract and the parse only.
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
- [x] **Finish** — fixtures regen, suites, lint/format, live verify, changeset,
      PR comments, DESIGN.md in assistant-toolkit/docs; shipped in #12752.

## Phase 4: Task execution from a chat

Raised 2026-08-30 after the first live delegation: the chat opened carrying the
task, and then nothing happened. The thread below turns "delegate" from a
gesture that files an object into one that actually gets work done and reports
back. Ordered as a chain — each item is what the one above it needs.

### Tasks

- [x] **The delegated chat never runs the task** — root cause was not a missing
      push but a session collision: delegation spawned a session with no model,
      and the chat's UI then asked for one carrying the user's selected model,
      which made `AgentService` terminate the running process mid-turn
      ("InterruptError: All fibers interrupted without error"). The prompt now
      goes through `AssistantOperation.RunPromptInChat`, which queues it for the
      chat's UI exactly as `RunPromptInNewChat` does, so one session runs the
      conversation.
- [x] **The opening prompt should reference the task, not restate it** — it
      points at the checklist the task is already bound to.
- [x] **The chat needs a tool that lists its tasks** — no new tool needed: the
      planning skill renders `chat.tasks` into the system prompt as a numbered
      checklist (`Chat.renderNumberedChecklist`), which is what the scripted
      story's session reads.
- [x] **Make the test task actually actionable** — "create a markdown document
      with a short poem", asserted on the document the session produces.
- [x] **A created document must land as an artifact of the project** — via the
      existing `ProjectOperation.ArtifactAdd`, which gained an optional `task`
      so the object is recorded on both the project and the task that made it.
- [x] **Mark the task `started` when the session picks it up** — set on
      delegation, so the row shows work underway from the moment the session
      has it.
- [x] **`Task.artifacts`** — a ref array of what the task produced, rendered as
      tags in the task list's tag column.
- [x] **`Task.reviewers`** — an optional array of `Actor`.
- [x] **A `review` status** — `Task.complete()` is the one place that decides
      work is finished, and it consults `reviewers`.
- [x] **Delegation assigns the current user as reviewer.**
- [x] **Delegation must not steal the task from its project** — `Chat.tasks` was
      an owning (`SetParent`) field, so adding a project's task re-parented it,
      and since membership is the parent edge the task disappeared from the
      project. Ownership is now decided at creation: `Chat.addTask` parents its
      own, a delegated task keeps the parent it arrived with, and
      `Chat.deleteTask` destroys only members the chat owns.
- [x] **Delegating should navigate to the chat it started** —
      `RunPromptInChat` opens it, so the reader lands on the work they just
      delegated.
- [ ] **Repair tasks already re-parented by the old owning checklist** — a task
      delegated before the fix still has the chat as its ECHO parent and stays
      missing from its project. One-off (`Obj.setParent(task, taskSet)`); decide
      whether it is worth a migration or just a manual fix in the affected
      spaces.

- [x] **A lone tool call renders outside its "Ran N commands" group** — fixed in
      `react-ui-assistant/renderer.ts`: `flushTools()` ran BEFORE the block was
      rendered, so a block rendering to nothing — an empty text block, which the
      runtime interleaves with tool calls — ended the run anyway. Rendered first
      now; only a block with visible output splits a run. Three tests in
      `renderer.test.ts`; the middle one fails without the fix. Verified live: the
      thread collapsed from three panels to one "Ran 5 commands".

### References

- `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts` —
  the operation this phase grows.
- `packages/stories/stories-assistant` — the working chat-with-tasks harness.

## Phase 3: Task UX backlog

Follow-ups raised while reviewing the TaskList and chat surfaces (2026-08-26).
Each is independent of the others. The checked items shipped in #12784, except
the hierarchical list, which is #12787.

### Tasks

- [x] **Hierarchical tasks in the list** — `TaskList` gains `hierarchical`,
      `onTaskMove` and controlled `collapsed` state; rows walk the tree
      (`walkTaskTree`), indent the title cell only, and carry `aria-level` /
      `aria-posinset` / `aria-expanded` while staying listbox options. Drag and
      drop reuses react-ui-list's tree-item hitbox, `TreeDropIndicator`,
      `useListDisclosure` and `paddingIndentation`; the grip lives in the
      ordinal's gutter, the preview clones the whole subtree, and the dragged
      rows are hidden for the drag's duration. `MoveTask` gained an optional
      `parentTask` so a drop is one mutation. Keyboard parity is `Alt`+arrow
      (not the outliner's `Tab`, which a listbox row cannot consume without
      trapping focus). The agent may nest: `CreateTask`/`UpdateTask` already
      take `parentTask`. NOT verified: the pointer drag itself — pragmatic-dnd
      uses native HTML5 drag events, which cannot be synthesized.
- [x] **Option to show the task description in the list** — `TaskList.Root`
      gains `showDescriptions`; a described row grows (`auto-rows-min`) and every
      other cell is pinned to the title's line, since a row is its own subgrid
      and the listbox item centres its cells by default. Off by default, so the
      chat strip stays one row per task. `WithDescriptions` story added.
- [x] **ProjectArticle tabs** — Overview (the form body) and Tasks (the ledger
      at full height) in the toolbar; the story also wraps the article in an
      `AttendableContainer`, without which nothing ever attends the article and
      the toolbar renders permanently unattended.
- [x] **Editing a task in a detail pane** — shipped in #12839.
      `TaskList.Create` became `TaskList.Edit`: it creates when nothing is
      selected and edits the selected task otherwise, with the title as an input
      and the description as a held-open markdown editor. Save and Cancel sit on
      the title line (a `density='sm'` toolbar) and both leave the pane; neither
      may take focus, since the fields commit on blur. Escape on a row deselects.
      Three defects fell out of building it, all fixed in the same PR: the
      markdown bundle without `createBasicExtensions` leaves the content
      `white-space: pre` (no wrap, no undo) and without `createThemeExtensions`
      the caret keeps CodeMirror's invisible 1px black; `Toolbar.Root` declared
      density as a CSS class only, but `Button`/`Input` stamp `data-density` from
      React context, and that stamp shadows the variable the class set around
      them — so a toolbar's density never reached its controls anywhere in the
      app; and tearing the editor down fires a blur, which commits, so a revert
      wrote the text it was discarding.

- [ ] **`composer-debug` cannot enable a plugin** — the skill documents reading the
      running app but not turning a plugin on, and the obvious route is a trap:
      `composer.manager.enable(id)` returns an **Effect**, so awaiting it does
      nothing and the plugin silently stays disabled. The working call is the
      operation `org.dxos.operation.registry.enablePlugins` with `{ ids: [...] }`
      (verified 2026-08-30 enabling plugin-tasks + plugin-projects, which both
      ship disabled in a default profile). Add it to the skill's recipes, and note
      that most plugins under development are off until enabled — otherwise every
      live verification starts by concluding the feature is missing.
- [ ] **Combine the Send/Stop buttons in `ChatPrompt`** — the two are separate
      controls today, so the prompt's trailing edge changes shape as a turn
      starts and stops. One button that swaps its icon and action with the
      session's running state keeps the target in place.
- [ ] **Toggle the task panel from `ChatPrompt`** — a button at the end of the
      bottom row showing/hiding the checklist, so a conversation that is working
      a task can surface it without leaving the prompt.
- [ ] **Move the online/offline toggle into the `ChatPrompt` options** — it is
      a read-only indicator on the chat today, derived from the provider in
      settings (`preset?.provider === Provider.edge.id`); as an option on the
      prompt it becomes the control it looks like.
- [ ] **An unresolvable subject empties the deck instead of showing 404** — proved
      2026-08-30 with the debug port: opening a path whose graph node does not
      exist (a project chat addressed at the assistant's Chats section) leaves
      the deck with no plank at all, and re-opening the correct path does not
      recover it — the EID dedup in `LayoutOperation.Open` remaps the second
      subject onto the broken entry. `NotFound.validateNavigationTarget` returns
      `NOT_FOUND_PATH` as designed, so the loss is downstream of it, in
      plugin-deck. A 404 plank would have made the delegation bug obvious in
      seconds rather than a blank screen.
- [ ] **Record when a task reached a terminal status** — `Task` carries no date
      at all today, so nothing can show when work finished or say how long it
      took. Stamp the transition into `done`/`failed`/`cancelled` wherever status
      is written (the TaskOperation verbs, the delegation strategy's fold-back,
      and the list's own toggle), and decide whether one `completed` field or a
      status-change timestamp is the right shape.
- [ ] **A plugin extension contributes a tab** — the Overview/Tasks tablist is
      hard-coded in `ProjectArticle`; make it a contribution point so e.g. a
      GitHub extension can add a PRs tab to a project. Needs a surface/capability
      for tab registration (label, icon, order) alongside the panel surface each
      tab renders.
- [ ] **`#nnn` does not resolve in the ProjectArticle story** — diagnosed
      2026-08-27, not yet fixed. The wiring is complete (the article collects
      `MarkdownCapabilities.ExtensionProvider` and passes it to the outline,
      which takes host extensions), `GitHubPlugin` IS mounted in the story now,
      and the project seeds a `dxos/dxos` Repo — but the outline still renders
      `#12752` as plain text. Cause: plugin-github's `MarkdownExtension` module
      activates on `MarkdownEvents.Start`, and the story's `corePlugins()` is
      attention/graph/process-manager/settings/theme only — no `MarkdownPlugin`,
      so the event never fires and no provider is ever contributed. Fix is to
      mount `MarkdownPlugin` in the story, or to activate the module on an event
      the story reaches. Works elsewhere: `plugins/plugin-tasks/components/
Outline` → `WithReferences` passes the extension directly.
- [x] **ProjectArticle `Sections` story was flaky (~1 run in 4)** — the seeding
      ran from `play`, racing the previous story's client teardown, and the
      article rendered with every ref-gated section missing. Seeding moved into
      `onClientInitialized`, so the graph exists before any story mounts: 7
      consecutive `--retry=0` runs green. The play functions now only wait for
      the seeded context.
- [ ] **`#foo` renders as a heading in chat markdown** — a `#` inside a message
      is parsed as an ATX heading, so `#foo` comes out as a title. The thread
      renders through CodeMirror (`MarkdownBlock` → `decorateMarkdown`), so the
      fix belongs there rather than in `MarkdownView`.
- [x] **`Repo` type + `Project.repo`** — a host-agnostic repository type in
      `@dxos/types` (`owner`, `name`, `url`, `defaultBranch`, optional
      `organization`; which host it lives on stays provenance on `Obj.getMeta`
      keys) and an optional `Project.repo` ref naming the repository a project's
      work lands in, independent of whether its tasks are mirrored. Project
      bumped to `0.6.0`.
- [x] **plugin-github contributes a `#nnn` decoration** — `githubReferences()`
      decorates `#nnn` as a link to `…/issues/<n>` (GitHub redirects to the PR
      when the number is one), contributed through
      `MarkdownCapabilities.ExtensionProvider`. The repo comes from the space:
      the TaskSet `sync` mirrors a repository into, matched by its `github.com`
      foreign key and `owner/repo` name; a space mirroring none or several
      declines rather than guessing. Code, code fences, and link targets are
      skipped. NOT covered: the task list renders descriptions through
      react-markdown, so `#nnn` there is inert (see the plain-text item).
- [x] **Outliner menu popover has no arrow** — not the outliner's: `Popover`'s
      content carried `overflow-hidden`, and Radix positions the arrow as a
      child of the content straddling its edge, so EVERY `Popover.Arrow` in the
      app was clipped. Clipping moved to `Popover.Viewport` (the box that
      scrolls and holds the rounded corners); verified live on the outliner menu
      and the react-ui popover story.
- [x] **Autolink bare URLs in chat markdown** — the chat renders messages through
      CodeMirror (`MarkdownBlock` → `decorateMarkdown`), not react-markdown. The
      GFM parser already emitted `URL` (bare) and `Autolink` (`<…>`) nodes, but
      `decorateMarkdown` only decorated the bracketed `Link` form, so neither
      rendered as an anchor. Both cases added, sharing one anchor decoration.
- [x] **Task descriptions in the list are plain text** — rendered through
      `MarkdownView` now, so a URL in a description is a link. `#nnn` there is
      still inert: that decoration is a CodeMirror extension and this path is
      react-markdown (tracked with the `#nnn` item above).
