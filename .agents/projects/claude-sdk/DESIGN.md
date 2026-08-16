# Claude Agent SDK host — DESIGN

Runs the Claude Agent SDK inside DXOS and projects its conversation into ECHO,
with a tree-shaped conversation UI as the end goal.

## Why the SDK is not a model provider

`@dxos/ai` exposes `Provider` (`edge`, `builtIn`, `ollama`, `lmStudio`,
`openai`) and `resolvers/*` over `@effect/ai-anthropic`. That seam serves **model
endpoints**. The Claude Agent SDK brings its own agent loop, tool
implementations, permission system and compaction — registering it as a provider
would nest two loops, and its `Bash`/`Edit` calls would execute where ECHO cannot
see them.

It therefore enters as an **agent whose transcript is projected into a feed**,
alongside `agent-runtime`'s `AgentService`/`agent-process` and
`@dxos/compute/Process`.

## The tree is already in the data

Three independent tree primitives already exist; none had to be invented:

- **SDK frames** carry `uuid`, `session_id`, `parent_tool_use_id` and
  `subagent_type`. `resume` + `forkSession: true` forks a session at a point.
- **`SessionLink`** (`@dxos/assistant/session`) links a session to a point in
  another session's history and replays the ancestor prefix — fork-at-a-message
  with the context-inheritance rule already decided.
- **`Feed.append(feed, items, { parent })`** continues from an earlier item,
  "leaving what followed it unreachable" — per-item branching in the feed itself.

`Projection` preserves the SDK's pointers in `Message.properties`
(`sdkUuid`, `sdkSessionId`, `parentToolUseId`, `subagentType`) so the branching
data survives milestones that do not yet use it.

## Permission posture

M1 runs `permissionMode: 'dontAsk'` with read-only `allowedTools`, scoped
`disallowedTools`, and `settingSources: []`.

- `dontAsk` denies anything that would otherwise prompt, which is what makes a
  host with no approval UI safe to run unattended. `default` blocks forever on a
  prompt nobody can answer; `acceptEdits`/`bypassPermissions` hand an unwatched
  process write access.
- `canUseTool` is only reached when the flow **falls through to a prompt**, so
  approval is an exception path, not per-call traffic — the eventual browser
  round-trip is cheap.
- `settingSources: []` stops the host inheriting the developer's own `~/.claude`
  hooks, which would otherwise fire inside the nested agent.
- `result.permission_denials` is the SDK's authoritative denial record. M1
  collects it, so a real approval surface can be designed from what workloads
  actually asked for.

The seam for later: make the permission decision an Effect service, constant-deny
in M1, browser round-trip later. Layer swap, not rewrite.

## Milestones

- **M1 — one turn, projected.** `@dxos/agent-claude`: `Options` (permission
  posture), `Projection` (SDK frames → `ContentBlock`/`Message`), `Host.Session`
  (`query()` → `Stream<Message>`). DONE.
- **M2 — a story driving the sidecar.** Sidecar as vite middleware in
  `stories-assistant` (same origin, no CORS, no process supervision); new
  `Agent.stories.tsx`; always live, never in CI. Verified by the repo's own
  `test-storybook` runner.
- **M3 — permission surface.** Designed from M1/M2's collected denials.
- **M4 — tree UI.** Multiple threads via a sidebar selector, quick switching, a
  common task list across branches.

## Open questions

1. Context inheritance for a branch: full ancestor path, path-to-fork only, or a
   summarised ancestor. `SessionLink` answers this for its own replay; a UI that
   forks needs the same decision made explicitly.
2. Concurrency: several branches running at once against one worktree.
3. Which branch a permission prompt belongs to, and what the others do while it
   waits.

## M3c — getting a turn into Composer's chat (2026-08-15)

### Correction: the thread DOES read the feed

Two earlier conclusions in this document's history were wrong and are retracted:

1. ~~"`AiChatProcessor.messages` reads in-memory atoms, never the feed, so an
   external writer cannot render."~~ **False.** `Chat.tsx` composes _both_:

   ```ts
   const feedMessages = useQuery(db, Query.select(Filter.type(Message.Message)).from(feed));
   const pendingMessages = useAtomValue(processor.messages);
   const { messages } = projectThread({ feedMessages, pendingMessages, rewindFrom });
   ```

   `feedMessages` is a reactive query over the chat's feed. `Feed.append` is a
   supported path into the thread.

2. ~~"`AgentService` is the only supported door."~~ Also false, and it followed
   from (1). `AgentService` is how the _assistant_ drives a turn; it is not a
   precondition for a message appearing.

`AiChatProcessor.present()` was added to work around (1). It is therefore
probably unnecessary — but it is harmless and still correct for messages that
have not reached the feed yet, so it stays until the real cause is known.

### What is actually unexplained

The story appends projected messages to `chat.feed` and the thread does not show
them. Given the above, the candidates are now narrow:

1. `feedMessages` never contains them — the reactive query does not match. Most
   likely if `Message.Message` is not registered in the story space's schema
   registry, or the `db`/`feed` the component reads differs from the one the play
   function wrote to.
2. `projectThread` drops them. It sorts by `byAppendOrder` then calls
   `Feed.history(sorted).items`. `Feed.history` walks backwards from the head
   following parent links, falling through to the predecessor when no parent key
   is present — so un-parented appends should survive. But its contract warns
   that the walk is **positional** and that pre-sorting by a wall-clock field
   "would corrupt it", and the story sets `created` from SDK frame timestamps.
3. The messages are there and something later filters them (rewind pointer).

These are distinguishable by dumping `feedMessages.length` and
`projectThread(...).messages.length` in the story before asserting. That is the
next step, and it must come before any further theory.

### Design consequence

If the cause is (1) or (3), the sidecar integration needs **no new seam at all** —
`Feed.append` plus the existing surface is the whole story, and M3c reduces to
routing the chat input at `Chat.tsx`'s `onSubmit`/`processor.request` to the
sidecar instead of the AI service.

Only if a turn must participate in process lifecycle (cancellation, hydration,
delegation, background tools) does the `AgentService` route become necessary.
That route is a project, not a wiring job: the existing implementation is ~1,100
lines (`AgentService.ts` 270 + `agent-process.ts` 840) built on `ProcessManager`,
and the turn is produced by `new AiSession.Session({ feed, runtime, instructions })`
inside a process fiber. Substituting the SDK there is best done by making
`agent-process` accept a pluggable turn producer rather than by writing a rival
`AgentService` — a change that needs the owner of `agent-runtime`.

**Decision: do not build an `AgentService` implementation until the render cause
is known.** The cheap diagnostic decides whether M3c is an afternoon or a project.
