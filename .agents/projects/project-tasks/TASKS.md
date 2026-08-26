# Project Tasks — Tasks

_Resume: decide whether to open the PR for the delegation fix (3 commits on `claude/agent-delegation-task-management-8bdbbe`). Uncommitted: none. Last: live-verified the sub-agent delegation loop end to end._

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
- [ ] **Open PR for the delegation fix** — 3 commits on this branch; add an
      assistant-toolkit changeset.
- [ ] **Joined story: delegation beside a TaskSet surface** — chat delegating
      while a `TaskSetArticle` (or ChatTaskList over the durable TaskSet) shows
      the agent task appear, run, and complete.
- [ ] **Promote-task verb** — outside delegation the agent still cannot create
      a durable Task (carried from plugin-projects; delegation is currently the
      only promotion path).

### References

- Delegation strategy: `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts`
- RunInstructions/completeJob: `packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts`
- Tool projection pattern (verbatim schema rationale): `packages/core/compute/assistant/src/tool-runtime/services.ts` (`projectFunctionToTool`)
- Stories: `packages/stories/stories-assistant/src/stories/Chat.stories.tsx`
- Related project: `plugin-projects` (registry) — task model, delegation-as-promotion
