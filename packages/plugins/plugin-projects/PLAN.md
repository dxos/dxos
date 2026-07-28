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

Each phase ships as its own PR and keeps main green. Phases that change
persisted shapes (A, B) are revertible only within an explicit
**dual-read/dual-write window**: A dual-reads the old shape and B dual-writes
the old field until D's migration closes the window — reverting after D means
restoring from the migration, not flipping a switch. Order matters: A unlocks
the preset channel, B removes the wrong-direction dependency, C and D delete
the duplicate machinery.

## Phase A — `Agent.instructions: Ref<Text>` → `Ref<Instructions>`

The typed object carries `skills`/`objects`/`commands`, which _is_ the preset
payload; after this phase "apply agent to chat" is one assignment.

- [x] Schema: `instructions: Ref(Instructions.Instructions)`
      (`types/Agent.ts`); keep `@0.1.0` — old data migrates in D's bump.
- [x] **Dual-read until D** — `Agent.loadInstructions`: a shared resolve helper accepts both shapes
      (target is `Text` → treat as instructions text; target is
      `Instructions` → typed), used by every reader below — existing agents
      keep working unmigrated, and reverting A cannot strand new-shape
      records unread (old readers loaded the ref as Text, which a dual-read
      helper subsumes).
- [x] `makeInitialized`: `Instructions.make({ text, skills })` (owned via
      `Obj.setParent`); `props.skills` recorded in `instructions.skills` (still
      bound to the feed binder — the delivery mechanism until C); bonus: the
      agent chat now sets `chat.instructions`, steering it through the
      milestone-3 channel.
- [x] Call sites ported to `loadInstructions` (get-context, qualifier) or the
      typed shape (skill.test helper, AgentProperties/AgentArticle stories).
- [ ] Verify: assistant-toolkit/compute/agent-runtime/plugin-assistant unit
      suites GREEN (234 tests); agent-skill memoized conversations need
      regeneration (`makeInitialized` shifts the deterministic id stream, so
      recorded tool-call refs dangle) — 4 conversations pending
      `ALLOW_LLM_GENERATION=1`, blocked on 1Password re-auth.

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
- [ ] `makeInitialized`: still creates a first chat (UX unchanged), sets
      `chat.agent` **and dual-writes `agent.chat`** until D — legacy readers
      (hydrated processes, un-migrated call sites, a reverted B) keep working;
      D's migration drops the field and ends the window.
- [ ] Verify: planning / delegation / agent skill tests (they anchor on
      `agent.chat` today — port to `chat.agent` or `CompanionTo`).

## Phase C — `cron` + `subscriptions` → Routines

`sync-triggers` compiles these imperatively into `Trigger` objects; a Routine
(instructions + trigger) is the same thing declaratively, shared with projects.

The as-is runtime this replaces (traced 2026-07-27): with `filterEvents`
(default) a subscription is a **two-stage pipeline** — feed trigger →
`Qualifier` (cheap model, `concurrency: 5`, relevance check) → qualified event
appended to `agent.feed` (the nominally-deprecated field is this pipeline's
staging queue) → second trigger on `agent.feed` → `AgentWorker`. Without
`filterEvents`, the subscription trigger invokes `AgentWorker` directly; `cron`
always does. `AgentWorker` builds an **ephemeral `AiSession` on the chat feed**
(hardcoded model, retry ×2) — it never touches the durable `AgentProcess`.
`AgentWorker`'s identity mechanism (assert exactly one Agent bound in the chat
context) is replaced by B's `chat.agent`.

**Decided shape (burdon × Dima, re-confirmed 2026-07-28): the relay pattern.**
Each subscription becomes a Routine (feed trigger) whose runnable is a
**`RelayFunction`** — it qualifies the event with a cheap model and, when
relevant, forwards it to the agent's **durable process** via
`AgentService`/ProcessManager (`Handle.submitInput`, or the `enqueueMessage`
Tier B RPC — both persist onto the process's durable input queue). This gives
multiplexing (N feed routines → one process) and filtering in one construct,
and resolves the substrate fork: **triggered runs move onto the durable
process**; `AgentWorker`'s ephemeral path retires and `agent.feed` dissolves
into the process input queue (fulfilling its own deprecation note,
"subscriptions will write directly to the agent"). `RelayFunction` does not
exist yet — the delivery surfaces do.

Known gap, accepted: **no backpressure** — events are durable once delivered,
but relays push as fast as triggers fire, so a hot feed grows the input queue
unboundedly. Escape hatch if it bites: reintroduce an intermediary feed the
process drains at its own pace (at the cost of the visible extra feed).

- [ ] `RelayFunction` (assistant-toolkit): input `{ chat: Ref<Chat>, event }`
      — the concrete contract, mirroring `RunInstructions.chat`: the chat is
      what carries history (feed), bound context, and the typed
      `instructions: Ref<Instructions>` (set from the agent's per B). Qualify
      (cheap model, reusing the Qualifier prompt); on relevant, get the durable
      session for `chat.feed` (passing `chat.instructions`) and submit the
      event as a prompt. Instructions reach the durable process via the
      existing spawn-annotation path — no separate ephemeral-path work needed.
- [ ] Agent wizard: a subscription creates a Routine (feed trigger →
      `RelayFunction` with the agent's chat ref); `cron` creates a Routine
      (timer trigger) that submits a wake prompt through the same relay path
      (same `chat` input, synthetic event).
- [ ] `enabled`: routines gain an owner gate or the flag moves onto each
      Routine; `sync-triggers` reduces to a migration shim (existing
      cron/subscription fields → Routines on first open), then deletes.
- [ ] Retire `AgentWorker` + `Qualifier` ops (the relay subsumes both);
      `get-context`'s chat/plan reads move per B.
- [ ] Verify: agent-wizard tests become routine-creation tests;
      trigger-dispatch memoized tests; a subscription fixture proves filtering
      (irrelevant event never reaches the process queue) and multiplexing (two
      feeds, one process).

## Phase D — remove `artifacts`; schema bump + migration

- [ ] Delete `Agent.artifacts`, `add-artifact` op, and the artifacts half of
      `get-context`; the model files via `ProjectSkill.artifact-add`.
- [ ] Bump `org.dxos.type.agent` → `0.2.0`; migration: inline `{name, data}`
      entries → a Collection on a Project created per agent (named after it);
      `agent.chat` (kept readable through B/C) reparented under that Project;
      drop `feed` / `filterEvents` and the transitional `chat`. NOTE:
      `feed`/`filterEvents` are deprecated in name only — they are the current
      qualifier pipeline's staging queue and its switch — so dropping them is
      **gated on C landing** (the relay dissolves the staging queue into the
      process input queue); `AgentArticle.tsx` also backfills `agent.feed`
      today.
- [ ] `makeInitialized` slims to identity + instructions (+ optional first
      chat via the chat factory).
- [ ] Verify: Agent.test round-trip at 0.2.0; a migration test (0.1.0 fixture
      → 0.2.0) asserting each inline artifact lands in the created project's
      Collection **and** is returned by `ProjectSkill.artifact-list`, and that
      the reparented chat still resolves its feed and instructions; full
      assistant-toolkit + plugin-assistant suites; and a live pass of
      `projects.eval.ts`, whose scorers already assert the replacement
      workflow end-to-end (artifact created → filed into the project
      Collection via `artifact-add` → bound into chat context).

## Phase E (optional) — rename the session host

`agent-process.ts` (the durable process behind interactive chats) never
references the `Agent` type — its identity is a feed, and its machinery (input
queue, alarms, tool-call manager, delegation supervisor, end-request hooks,
HarnessControl) is per-conversation, configured by layer options. Once "Agent"
means the identity/preset type, the name `AgentProcess` actively misleads.

- [ ] Rename `AgentProcess`/`AgentEvent`/`AgentService` toward
      "session host" vocabulary (e.g. `SessionProcess`, `SessionHost`) — naming
      only, no behavior.
- [ ] `AGENT_PROCESS_KEY` is `org.dxos.testing.process.agent` — a `testing`
      namespace in a production identifier, and the **hydration key** for
      persisted process records; changing it needs a compat alias (hydrate by
      old key, spawn by new) or a record migration, not a find-and-replace.
- [ ] Can land any time — zero coupling to phases A–D (verified: the file has
      no `Agent`-type reference).

## Non-goals

- Permissions on Agent (tracked, later).
- Multi-agent rosters per project (decided alongside the deferred
  agent-roster item).
- UI redesign of the agent wizard beyond what C forces.

## Risks

- **Durable processes** hydrate from spawn annotations; B/C change what
  trigger inputs carry, so shims must accept both shapes for one release.
- **Substrate unification (resolved 2026-07-28).** C moves triggered runs onto
  the durable process via the relay pattern, ending the ephemeral/durable
  split for agents; the relay is the only new moving part. The durable process
  itself is Agent-type-free (see phase E) and unchanged.
- **Queue growth without backpressure** (see phase C): a hot subscribed feed
  can grow the process input queue faster than turns drain it; the
  intermediary-feed escape hatch is the mitigation.
- **Memoized-LLM tests** encode current tool surfaces (`add-artifact`,
  `get-context` artifacts); D re-records them.
- `enabled` semantics during C: don't strand existing disabled agents —
  migration copies the flag onto generated Routines.
