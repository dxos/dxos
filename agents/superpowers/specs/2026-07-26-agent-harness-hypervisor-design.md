# Design: DXOS Agent Harness & Hypervisor

- **Date:** 2026-07-26
- **Status:** Draft (approved for spec commit)
- **Owner:** dmytro@braneframe.com

## Summary

Two AI models cooperate to drive long-horizon, largely-unsupervised work on the
DXOS `dx` CLI (which runs Composer plugins, ECHO data, and operations):

- **Hypervisor** — Claude Code, running fully autonomously (ideally *as* a Claude
  cloud agent, which is itself the container/isolation boundary). Owns
  orchestration, error recovery, heavy-lifting / core-code edits, per-wake
  critique, git checkpointing, profile backup/restore, the time log, and
  postmortems.
- **Composer agent** — a long-lived `dx agent` process (an `AgentProcess` built
  on the existing non-interactive path). Owns task execution, data/operations
  work, and light self-editing of non-core plugins, while maintaining a durable
  journal and plan.

The goal is to spend **most of the wall-clock inside the Composer harness** and
fall out to the hypervisor only for recovery, heavy lifting, and critique. Goals
can be **data-driven** (build a CRM, do research, extract data) or
**development-driven** (create/improve a plugin, define data types, add
operations), and are typically achieved with a mix of both.

## Existing substrate (what we build on)

This is largely an orchestration + lifecycle + recovery layer over pieces that
already exist:

- **Non-interactive agent loop** — `dx chat --prompt "<text>"` already runs the
  agent loop to completion with no TUI and exits
  (`packages/devtools/cli/src/commands/chat/non-interactive.ts`).
- **Session = ECHO `Feed`** — `AgentService.getSession(feed, …)` reattaches to a
  session by its feed. Continuation is "pass an existing feed DXN"; the primitive
  exists, it is just not surfaced on the CLI.
- **Process runtime** — `AgentProcess`
  (`packages/core/compute/agent-runtime/src/agent-service/`) is already a
  long-lived, hibernating, process-backed turn loop with a supervisor/child
  **delegation** model (`makeDelegationStrategy` → Routine + Task). This is the
  "Composer harness" runtime.
- **Skills + operations** — the Composer agent already executes skills and
  operations and can read `AGENTS.md` / repo skills. What it lacks today is
  file-write + bash tooling.
- **Memory today** — context with compaction, plus the beginnings of planning and
  memory. This design builds toward fuller external memory; it does not assume it
  already exists.

## Roles & topology

- The hypervisor and the Composer agent operate on **one checkout** inside the
  container.
- **Mutual exclusion is the safety invariant:** the Composer agent running ⟺ the
  hypervisor sleeping (`bash sleep`); the Composer agent exited ⟺ the hypervisor
  acts. There are never two concurrent writers to the working tree, which is what
  makes the shared checkout safe.
- The hypervisor runs `dx agent` **asynchronously** and uses `bash sleep` for long
  intervals. Each wake is both a liveness/progress check and a critique
  opportunity (see §Recovery / stall detection).

## Aspect A — CLI bridge & session continuation

- **`dx agent -p "<prompt>"`** — non-interactive; streams the agent's work and
  final reply to stdout as **plain human-readable text**. The hypervisor is Claude
  Code and reads unstructured stdout directly, so there is **no wire protocol** —
  prose is the interface. Implemented on the existing `runNonInteractive` path
  (may be a thin alias/rename of `dx chat --prompt`, or a dedicated `agent`
  command that shares the code path).
- **`--continue <session-uri>`** — reattach to an existing session instead of
  creating a fresh feed. Session identity = the ECHO `Feed` DXN; reuses
  `AgentService.getSession(feed)`. The session persists across restarts.
- On exit, the command **prints the continuation hint** so the hypervisor is
  reminded how to resume:

  ```
  » continue: dx agent --continue <uri> -p "<next prompt>"
  ```

- **Sentinel exit codes** let the hypervisor branch without parsing stdout:
  - `0` — turn complete / idle (nothing more to do this turn).
  - `75` — **wants-reload**: the Composer edited code and needs a restart to load
    it.
  - any other non-zero — **crash** / runtime error.

## Aspect B — self-editing (soft-restricted, git-gated)

The Composer's own runtime is loaded from the same code it may edit, so B is
coupled to C: a self-edit that fails to compile *is* the "code corruption"
recovery scenario. The edit protocol and the recovery net are therefore the same
mechanism.

- **New tool capabilities for the Composer agent:** `fs` (read/write files) and
  `bash` (exec). Isolation comes from the container (see §Isolation), not from a
  hard path allowlist.
- **Soft (prompt-based) core/leaf boundary — not enforced.** The Composer *can*
  technically edit anything, but its system prompt instructs it to:
  - edit only **non-core plugins / leaves** (plugins, operations, skills,
    schema/data-type definitions);
  - defer **heavy lifting and core edits** (`agent-runtime`, `client`, `echo`, CLI
    bootstrap) to the hypervisor by describing the needed change on stdout.

  We start soft so the system is flexible; a hard allowlist can be added later if
  the Composer proves prone to bricking its own bootstrap.
- **Git-gated reload loop (the "gate" is the hypervisor):**
  1. Composer makes edits, checkpoints its turn to the journal, exits `75`
     (wants-reload).
  2. Hypervisor runs the **boot health-check** (§Recovery) on the edited tree.
  3. **Green** → commit a checkpoint `harness: checkpoint <n>`, take a paired
     profile snapshot, restart the Composer with `--continue`.
  4. **Red** → discard the edit (`git reset`/stash), restart on the last
     known-good checkpoint, and **inject the failure** (error + stdout tail) into
     the Composer's next prompt.
- **Cooperative restart:** cold restart always (simplest; matches recovery). The
  feed is persisted, so `--continue` resumes the conversation; only the in-memory
  turn is lost, which the journal covers.

Because every accepted edit is a known-good, health-checked commit, the
**checkpoints themselves are the recovery net** — Aspects B and C are unified.

## Aspect C — error recovery

### Defining "known-good": the boot health-check

The hypervisor cannot tell a good checkpoint from a bad one without a health
check. Known-good = the last commit that passes:

- **Scripted smoke test** — `dx` starts, plugins load, `dx agent -p "ping"`
  round-trips within a timeout.
- **Hypervisor judgment** — Claude Code additionally *watches stdout and agent
  behaviour* and may declare a state unhealthy even if the scripted test passes
  (e.g. the agent is looping, producing garbage, or ignoring the goal).

The last known-good commit is the `git reset` target for code recovery.

### Scenarios → response

| Scenario | Response |
| --- | --- |
| **Runtime crash** (non-`75` exit) | Restart; inject exit code + stdout/stderr tail + journal into the Composer's next prompt so it knows it crashed and why. |
| **Code corruption** (edit fails to load) | `git reset` to last known-good checkpoint; restore paired profile if needed; inject the failure. |
| **Profile corruption** (CLI won't open the profile) | Restore the paired SQLite snapshot (§Profile backup). |
| **Stall / hang** (alive-but-stuck) | The `bash sleep` wake **is** the heartbeat: on wake the hypervisor inspects journal mtime + stdout progress + git diff. No progress within budget → interrupt, snapshot, re-prompt or escalate. |

### Circuit breaker

To prevent thrashing (edit → crash → restore → same edit → crash …):

- Same checkpoint fails the boot health-check **N** times, **or**
- **M** recovery cycles pass with no measurable progress,

→ the hypervisor **stops**, writes a postmortem, and escalates to a human. This is
one of the few conditions under which the otherwise-autonomous hypervisor halts
(see §Autonomy).

### Profile backup mechanics

- **SQLite/WAL is atomic.** Each WAL frame carries cumulative checksums and a
  commit marker; a transaction is durable only once its commit frame lands. On
  open, SQLite replays the WAL, validates checksums, and **discards any frames
  after the last valid commit** — a mid-write kill rolls back cleanly to last
  committed state, never to corruption.
- **The hazard is `cp` ordering, not corruption.** A naive live `cp` of the `.db`
  alone loses committed-but-not-checkpointed data still in `-wal`. Copying
  `db + -wal` (db first) is safe; `-shm` is volatile and need not be copied.
- **Recommended recipes:**
  - *Backup while the process is down* (the common case — the hypervisor acts
    only when the Composer has exited): clean shutdown runs
    `PRAGMA wal_checkpoint(TRUNCATE)`, then single-file `cp`.
  - *Live snapshot* (backup while the harness is working): **`VACUUM INTO
    'snap.db'`** or the SQLite Online Backup API → one consistent file. This is a
    natural fit for a small `dx` **db-export plugin** (nice-to-have, not on the
    critical path).
- **Pairing & rollback skew:** take a profile snapshot **paired with each
  known-good code checkpoint**, and restore code + profile **together**. Never
  roll code back past a schema migration without restoring the paired profile.

### Time log & postmortems

- **Time log** — append-only record of runs started/exited, backups made, restores
  performed, checkpoints committed, and escalations. Populated from the
  hypervisor's own actions plus its transcription of the Composer's stdout
  progress. Used to rehydrate the Composer after a critical recovery.
- **Postmortems** — on any hypervisor intervention, write a postmortem **as a
  replayable bash script** capturing what happened and the exact recovery
  commands, for audit and replay.

## Long-horizon memory (the engine)

Long-horizon behaviour comes from durable artifacts the Composer re-reads on every
`--continue`, not from context alone:

- **Journal** — append-only markdown, one entry per turn (*did / decided /
  blocked*). It survives truncated stdout, so it is simultaneously the
  crash-recovery record, the rehydration source, and the hypervisor's critique
  input.
- **Plan / goal object** — reuse the existing plan/Task/delegation model
  (`makeDelegationStrategy` → Routine + Task). The Composer maintains its plan and
  checks off tasks across restarts.
- **Budgeted subagents** — spawning children with **token/time budgets** becomes a
  Composer-harness feature (the delegation primitive already exists in
  `AgentProcess`); results fold back into the parent conversation. This is also
  the mechanism for bounding runaway cost.

## Evaluation & critique (configurable; future framework)

- **Per-wake hypervisor critique** — reads journal + git diff, judges progress and
  quality, decides continue / redirect / stop.
- **Configurable judge set per task** — the exact judges depend on the goal and are
  configurable: LLM-judge (data goals), build + test (dev goals), doc/code-quality
  LLM pass, data health checks.
- **North star** — a harness **plan → execute → critique** mode with pluggable
  judges. Specified here as direction; not fully built in this phase.

## Autonomy (hypervisor operating rules)

The hypervisor runs **fully autonomously and unsupervised**:

- It **never** uses an ask-the-user / clarifying-question tool and **never stops to
  ask** anything.
- It stops **only** when either:
  1. a **critical error** occurs that matches a user-defined list provided up
     front (see §Configuration), or
  2. the task is **complete in its entire scope** and absolutely nothing more
     useful can be done.
- For **core** code it makes **necessary or easy fixes autonomously**; for **bigger
  fixes or improvements** it leaves **isolated suggestion files** (self-contained,
  actionable notes) to be handled asynchronously later, rather than blocking the
  run.

## Isolation

- **Target:** run the whole thing inside a container. The realistic vehicle is a
  **Claude cloud agent**, which is itself a container — the hypervisor, the
  Composer agent, and the checkout live inside it, and `bash` blast radius is
  bounded by it.
- **Local fallback:** a Docker container, or (weakest) a dedicated checkout with a
  bash allowlist.

## Configuration (per run)

Provided to the hypervisor up front:

- **Goal** — the objective (data-driven and/or development-driven).
- **Critical-error list** — the conditions under which the hypervisor is allowed to
  stop and escalate.
- **Budgets** — token/time caps for the run and for subagents; circuit-breaker
  thresholds (`N` boot failures, `M` no-progress cycles).
- **Judge set** — which critique judges apply to this goal.
- **Isolation target** — cloud agent / docker / local checkout.

## Build sequence (the spine)

Even though this is one document, implementation is sequenced so risk unwinds in
order and each phase is independently useful.

1. **Phase A — CLI bridge.** `dx agent -p` + `--continue` + continuation hint +
   exit-code protocol. Independently useful (two-model cooperation with no
   recovery yet). *Confidence ~90%.*
2. **Phase C — recovery.** Boot health-check, git checkpointing, profile
   backup/restore, time log, postmortems, stall detection, circuit breaker.
   *Confidence ~75%.*
3. **Phase B — self-editing.** `fs`/`bash` tools, soft core/leaf prompting,
   cooperative-restart reload loop, journal + plan memory, budgeted subagents.
   *Confidence ~70% mechanically.*
4. **Phase D — critique framework (future).** Configurable plan → execute →
   critique judges.

## Risks & confidence

- **Phase A working end-to-end: ~90%.** Substrate exists; mostly surfacing.
- **Phase C recovery: ~75%.** Git checkpoint/restore is easy; the real work is the
  boot health-check and rollback skew.
- **Phase B mechanically: ~70%.** Tractable once A and C exist.
- **The overall vision — an autonomous two-model loop producing durable, useful
  long-horizon results with minimal intervention: ~35–45%.** This number is
  dominated by **agent-behaviour design** (journal/plan/critic/prompting and model
  capability), **not** by this spec's engineering. The architecture's key
  strength is that it is incremental: Phase A alone delivers value and teaches the
  interaction model cheaply, and Phase C proves the safety net before Phase B lets
  the Composer edit itself.

## Out of scope

- UI / Composer surfaces (the CLI has no surfaces; not useful to the model here).
- The full pluggable critique framework (Phase D — direction only).
- Hard sandboxing beyond the container boundary.
