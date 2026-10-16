# Fieldstone projects

Fieldstone's work in flight, done mostly by agents. Agents hold most of the tasks, humans review
them, and every agent task that has run has the chat and trace behind it. That history is what the
project Gantt and the trace panel draw.

- Code: this directory, not written yet
- Requires: [team](../team/CONTENT.md) (`people.*`, `agents.*`)
- Optional: [inbox-crm](../inbox-crm/CONTENT.md). When the template includes it, projects link the
  threads and customers listed under Links.
- Provides: `projects.<key>`, `taskSets.<key>`, `tasks.<key>`, `chats.<key>`, `artifacts.<key>`
- Clock: work runs from −60d to +30d. Every agent run is finished by the reference date.
- Used by: a Fieldstone Labs template, not written yet

## Contents

### Projects

- 4 `Project.Project`, each with `Instructions`, a `TaskSet`, artifacts and a repository:
  - `cache` Cairn 1.8: remote cache v2, `active`, 20 tasks, almost all agent work
  - `billing` Usage-based billing on Stripe, `active`, 12 tasks
  - `soc2` SOC 2 Type I readiness, `active`, 12 tasks, most drafted by Scribe
  - `offsite` Q4 offsite, `active`, 6 tasks, all human
- Each TaskSet has 1 to 3 `Milestone`s, for example "Cache v2 in beta" and "1.8 shipped".

### Tasks

- 50 `Task`s across the 4 sets, created from −60d onward.
- Status mix: 20 `done`, 5 `review`, 8 `started`, 3 `blocked`, 2 `failed`, 10 `todo` or `backlog`,
  2 `cancelled`.
- 35 are assigned to an agent: `assignee` is an Actor with the agent's `identityDid`, and
  `subject` set to its chat once one exists. The rest go to people, with `contact: Ref<Person>`.
- Agent tasks in `review` or `done` have a human in `reviewers`.
- Every task has a `priority` and an `estimate`. Some have `subtasks`. `dependsOn` chains of 3 to 5
  tasks give the Gantt real dependencies.
- `history` records each status change with its date and actor. Two tasks carry a `question` from
  an agent and an `answer` from a person.
- One `failed` task shows a Builder run that broke on a flaky integration test, a retry that also
  failed, and Omar's note in `history`. Its dependent is `blocked`.

### Execution history

- 40 `Chat`s, one per agent run, from −60d to the reference date with at least one run every week.
- Each chat is parented to its project with `Chat.linkCompanion({ chat, subject: project })`, which
  is how `useProjectChats` finds it. Each lists at least one task in `tasks`; a chat with no tasks
  gets no Gantt lane.
- The task's assignee Actor carries `subject: Ref<Chat>` for its latest run.
- Each chat's feed holds 8 to 30 `Message`s: the task brief, assistant turns, tool calls and their
  results (repository search, file edits, test runs, opening a pull request), and a closing summary.
- One trace `Feed` with kind `dxos.org.feed.trace`, created the way `getOrCreateTraceFeed` creates
  it. Each run appends `Trace.Message`s with `meta.pid`, `meta.processName` set to the agent's name,
  and `meta.conversation` set to `Ref(chat.feed)`. Events, all on the reference clock:
  - `AgentRequestBegin` and `AgentRequestEnd` bracket the run
  - `OperationStart` and `OperationEnd` around each tool call
  - `TaskStatusChanged` (`taskId`, `status`, `previousStatus`) at each status change the run makes
  - `QuestionAsked` and `QuestionAnswered` on the two tasks with a question
  - `DelegationSpawned` and `DelegationCompleted` when a Builder run hands off to a Reviewer run,
    whose `meta.parentPid` is the Builder run's `pid`
- Run lengths vary from 2 minutes to 3 hours. Runs overlap in time, so the Gantt has parallel lanes.
- Every run is finished. The 8 `started` tasks are waiting on their next run.
- The Gantt draws session lanes from `AgentRequestBegin`/`End` and task bars from
  `TaskStatusChanged`. It does not read `Task.history` for bars, and edit history carries the build
  time, so every status change that belongs on the Gantt is a `TaskStatusChanged` event. Tasks
  assigned to people have no runs; their bars come from edit history and no flow relies on them.

### Routines and documents

- 1 `Routine` for Triage, a nightly inbox and issue sweep, with a disabled timer `Trigger`.
- 5 `Markdown.Document` as artifacts:
  - `cacheDesign` "Remote cache v2 design" (`cache`)
  - `billingPlan` "Billing migration plan" (`billing`)
  - `soc2Policies` "SOC 2 policy set" (`soc2`, drafted by Scribe)
  - `offsiteAgenda` "Offsite agenda" (`offsite`)
  - `releaseNotes` "Cairn 1.8 release notes", a draft by Scribe, linked from the release task

### Links

When the template includes inbox-crm:

- `billing`: instructions name the `stripeBilling` thread by subject; Instructions context holds
  Stripe, Dana and the mailbox.
- `soc2`: instructions name the `meridianSecurity` thread by subject; Instructions context holds
  Meridian, Aisha and the mailbox.
- `cache`: Instructions context holds Okapi and Nadia. The task "Fix cache-key collision on
  concurrent writes" names the `okapiIncident` thread by subject in its description.
- `offsite`: Instructions context holds Saltmarsh Lodge and Wren. `offsiteAgenda` links both inline
  and embeds the offsite event as a card.

### Collections

- Projects: the 4 projects. Their documents sit under them as artifacts.

## Flows

1. Open `cache`, see the Gantt with lanes for each agent run and bars for each task.
2. Click a Builder task and open its chat. Open the trace panel, find the run by its Builder label
   and time, and see its tool calls.
3. Open the failed task, read why it failed, and follow `dependsOn` to the blocked task.
4. With inbox-crm: read the thread subject in `soc2`'s instructions, find it in the inbox, open it.
5. With inbox-crm: open the cache-key collision task, find the `okapiIncident` thread its
   description names, and open Nadia's contact from the thread.

## Checks

- 4 projects, 4 task sets, 50 tasks with the status mix above.
- 35 tasks are assigned to an agent.
- 40 chats, with at least one run in every week from −60d to the reference date.
- Every agent task in `started`, `review`, `done` or `failed` has at least one chat and one trace,
  and one `TaskStatusChanged` event per status change.
- Every trace's `meta.conversation` resolves to a chat's feed in the space.
- Every timestamp in a chat or trace falls between −60d and the reference date.
- The Gantt for `cache` shows at least 3 parallel lanes.
- The trigger is disabled.
