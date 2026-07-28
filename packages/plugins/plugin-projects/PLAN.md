# Agent ↔ Project reconciliation — Plan

Proposal: shrink `Agent` to an identity/preset (`name`, `did`,
`instructions: Ref<Instructions>`, future permissions) and make `Project` the
only container (artifacts, routines, chats). Rationale and field-by-field
analysis: [DESIGN.md § Agent ↔ Project convergence](./DESIGN.md).

Target model:

- **Agent** = identity + skill set (via its typed Instructions), no history.
- **Project** = chat factory + container; spawns chats with different skill
  sets or Agent identities.
- **Chat** = instance + history; `instructions` steers it; `agent?` attributes
  it. An agent is a _preset_, applied at chat creation.

Each phase ships as its own PR, keeps main green, and is independently
revertible. Order matters: A unlocks the preset channel, B removes the wrong
direction dependency, C and D delete the duplicate machinery.

## Phase A — `Agent.instructions: Ref<Text>` → `Ref<Instructions>`

The typed object carries `skills`/`objects`/`commands`, which _is_ the preset
payload; after this phase "apply agent to chat" is one assignment.

- [ ] Schema: `instructions: Ref(Instructions.Instructions)`
      (`types/Agent.ts`); keep `@0.1.0` — field shape changes but old data is
      migrated in D's bump (until then, `makeInitialized`-created agents are
      the only writers).
- [ ] `makeInitialized`: `Instructions.make({ text: props.instructions })`
      (owned: `Obj.setParent(instructions, agent)`); move `props.skills` into
      `instructions.skills` instead of raw binder args.
- [ ] Call sites that load the ref as Text: `get-context.ts` (returns
      `instructions.text` content), `qualifier.ts`, `skill.test.ts` helper.
- [ ] Verify: assistant-toolkit unit + agent skill memoized tests.

## Phase B — invert `Agent.chat` → `Chat.agent?: Ref<Agent>`

Whoever invokes a run already holds the Chat (see the call-site table in
DESIGN.md); the agent should not own conversation state.

- [ ] `Chat` gains `agent?: Ref<Agent>` — same file, no layering change (both
      types live in assistant-toolkit).
- [ ] `AgentWorker` (`skills/agent/operations/agent.ts`): input becomes
      `{ chat }` (or `{ agent, chat }` during transition); resolve feed from
      the chat, identity from `chat.agent`.
- [ ] `qualifier.ts`: receives the chat in its trigger input rather than
      `agent.chat`.
- [ ] `resetChatHistory` → `Chat.resetHistory(chat)` (feed rebuild is
      chat-shaped); agent variant delegates until D.
- [ ] "The agent's chats" = query on `Chat.agent` (or the existing
      `CompanionTo`); removes the single-chat limitation
      (`TODO(dmaretskyi): Multiple chats`).
- [ ] `makeInitialized`: still creates a first chat (UX unchanged) but sets
      `chat.agent` and stops writing `agent.chat`; keep the field readable
      until D so hydrated processes don't break mid-migration.
- [ ] Verify: planning / delegation / agent skill tests (they anchor on
      `agent.chat` today — port to `chat.agent` or `CompanionTo`).

## Phase C — `cron` + `subscriptions` → Routines

`sync-triggers` compiles these imperatively into `Trigger` objects; a Routine
(instructions + trigger) is the same thing declaratively, shared with projects.

- [ ] Agent wizard: creating a schedule/subscription creates a `Routine`
      (timer / feed trigger) whose runnable is `RunInstructions` over the
      agent's instructions, input carrying the target chat (per B).
- [ ] Qualifier folds into the subscription-routine (first stage of its
      runnable or its instructions).
- [ ] `enabled`: routines gain an owner gate or the flag moves onto each
      Routine; `sync-triggers` reduces to a migration shim (existing
      cron/subscription fields → Routines on first open), then deletes.
- [ ] Verify: agent-wizard `sync-triggers` tests become routine-creation
      tests; trigger-dispatch memoized tests.

## Phase D — remove `artifacts`; schema bump + migration

- [ ] Delete `Agent.artifacts`, `add-artifact` op, and the artifacts half of
      `get-context`; the model files via `ProjectSkill.artifact-add`.
- [ ] Bump `org.dxos.type.agent` → `0.2.0`; migration: inline `{name, data}`
      entries → a Collection on a Project created per agent (named after it);
      `agent.chat` (kept readable through B/C) reparented under that Project;
      drop deprecated `feed` / `filterEvents` and the transitional `chat`.
- [ ] `makeInitialized` slims to identity + instructions (+ optional first
      chat via the chat factory).
- [ ] Verify: Agent.test round-trip at 0.2.0, migration test (0.1.0 fixture →
      0.2.0), full assistant-toolkit + plugin-assistant suites, and a live
      pass of `projects.eval.ts` (unchanged expectations prove the container
      path was already agent-free).

## Non-goals

- Permissions on Agent (tracked, later).
- Multi-agent rosters per project (decided alongside the deferred
  agent-roster item).
- UI redesign of the agent wizard beyond what C forces.

## Risks

- **Durable processes** hydrate from spawn annotations; B/C change what
  trigger inputs carry, so shims must accept both shapes for one release.
- **Memoized-LLM tests** encode current tool surfaces (`add-artifact`,
  `get-context` artifacts); D re-records them.
- `enabled` semantics during C: don't strand existing disabled agents —
  migration copies the flag onto generated Routines.
