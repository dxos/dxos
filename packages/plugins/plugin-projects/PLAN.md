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

- [x] `Chat` gains `agent?: Ref<Agent>` — both directions of the Agent ↔ Chat
      cycle are `Schema.suspend`ed (module-eval TDZ otherwise).
- [x] `AgentWorker`: transitional `{ agent, chat? }` input — prefers the
      invocation's chat, falls back to legacy `agent.chat`; the ephemeral
      session now also receives `chat.instructions` as steering.
- [x] `qualifier.ts`: same transitional `chat?` input with `agent.chat`
      fallback; `sync-triggers` stamps `chat` into all three trigger inputs.
- [~] `resetChatHistory`: rebuilt chat now carries `agent` + `instructions`
  refs (phase-B shape); the full extraction to `Chat.resetHistory` is
  deferred to D with the rest of the field's removal — the helper still
  rewrites `agent.chat` (deliberately: that is B's dual-write).
- [x] "The agent's chats" = query on `Chat.agent` (or the existing
      `CompanionTo`); removes the single-chat limitation
      (`TODO(dmaretskyi): Multiple chats`).
- [x] `makeInitialized`: still creates a first chat (UX unchanged), sets
      `chat.agent` **and dual-writes `agent.chat`** until D — legacy readers
      (hydrated processes, un-migrated call sites, a reverted B) keep working;
      D's migration drops the field and ends the window.
- [ ] Verify: unit suites GREEN post-B (assistant-toolkit 30, agent-runtime 22,
      plugin-assistant 136); test anchors on `agent.chat` still work via the
      dual-write (porting them lands with D). Memoized agent-skill
      conversations pending regeneration (shared with A; blocked on 1Password).
      NOTE: A + B shipped together in one PR per user sequencing — a recorded
      deviation from one-PR-per-phase.

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

- [x] `Relay` op (assistant-toolkit, skills/agent/operations/relay.ts): input `{ chat: Ref<Chat>, event }`
      — the concrete contract, mirroring `RunInstructions.chat`: the chat is
      what carries history (feed), bound context, and the typed
      `instructions: Ref<Instructions>` (set from the agent's per B). Qualify
      (cheap model, reusing the Qualifier prompt); on relevant, get the durable
      session for `chat.feed` (passing `chat.instructions`) and submit the
      event as a prompt. Instructions reach the durable process via the
      existing spawn-annotation path — no separate ephemeral-path work needed.
- [x] Agent wizard (`sync-triggers`): a subscription compiles to a Routine
      (feed trigger → `Relay` with the agent's chat ref; `filterEvents` maps to
      the relay's `qualify` switch); `cron` compiles to a timer Routine with a
      synthetic wake prompt. The two-stage `agent.feed` pipeline is gone; each
      sync deletes and recreates Routines+Triggers, which migrates legacy
      agents on their next sync.
- [x] `enabled`: propagated onto each compiled Trigger, as before;
      `sync-triggers` is now the compile-to-Routines shim (its deletion — and
      moving cron/subscription authoring onto Routines directly — lands with D).
- [~] `AgentWorker` + `Qualifier` deprecated and no longer compiled into
  triggers; handlers stay registered so pre-relay triggers persisted in
  user DBs keep firing until their next sync — both delete with D.
- [x] Verify: cron/enabled tests ported to the Routine+Relay shape; new
      control-plane relay test proves delivery onto the durable process
      (AgentService registered in the test resolver via a late-bound capture,
      like HarnessService). Remaining: a memoized filtering/multiplexing
      fixture (queued with the pending conversation regeneration).

## Phase D — remove `artifacts`; schema bump + migration

- [x] Deleted `Agent.artifacts`, the `add-artifact`/`AgentWorker`/`Qualifier`
      ops (+ `sync-triggers`), and the artifacts half of `get-context`; the
      model files via `ProjectSkill.artifact-add`. The agent skill's template
      now points at project filing. `SyncTriggers` became `SyncAutomation`
      (config on the invocation — the agent stores no automation fields) with
      per-category reconcile, so a subscriptions-only update cannot drop the
      schedule routine.
- [x] `org.dxos.type.agent` → `0.2.0` (`name`/`did`/`enabled`/`instructions`
      only). **No data migration** (decided by user 2026-07-28): 0.1.0 agents
      are abandoned and recreated — the `LegacyAgent` schema and the registered
      `agentMigration` were built, validated by test (including the gotcha that
      migration snapshots deliver refs in ENCODED form `{'/':dxn}`, never live
      Refs), then removed; recover from commit 11802071c1 if a migration is
      ever needed.
- [x] `makeInitialized` slims to identity + instructions + first chat
      (with `agent`/`instructions` refs); `resetChatHistory` rebuilds via the
      `CompanionTo` relation (new `Agent.loadChat` helper). UI ports:
      `AgentArticle` = instructions editor + reset (artifacts/inputs tabs died
      with their fields); `AgentProperties` derives subscription state from
      compiled trigger foreign keys and toggles via `SyncAutomation`;
      stories-assistant `ContextModule` reads the project collection.
- [x] Verify: Agent.test 0.2.0 shape + migration test (0.1.0 fixture → typed
      instructions, artifacts→Project Collection asserted via
      `ProjectSkill.artifact-list`, chat inversion, cron→routine) GREEN; full
      suites GREEN post-D (compute 46 / agent-runtime 22 / assistant 43 /
      assistant-toolkit 30 / plugin-assistant 136). Outstanding: memoized
      agent-skill conversations regeneration (queued on 1Password) and a live
      `projects.eval.ts` pass — both blocked on `op` re-auth.

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
