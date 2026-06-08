# Agent durability — `restart during tool call` test

PR #11683 — branch `claude/trusting-volta-Eq0fL`.

## Stage 1 — make `restart during tool call` pass (DONE pending verify)

### Symptom
`src/agent-service/AgentService.test.ts > Agent Service > restart during tool call` times out at 15s.

### Diagnosis (confirmed from test.log, ProcessManagerImpl#2)
Restart-during-tool-call re-runs the agent's interrupted alarm on hydrate (idempotent
re-execution). The re-run re-issues the AI request, which re-calls the Research tool and
**spawns a fresh research child (pid 5)**. The pre-restart child (pid 4) is suspended and
never rehydrated — it is orphaned, but its Deferred task `t_a` is still sitting in the
`ResearchService.tasks` FIFO.

The resume fiber calls `completeOneTask()`, which `shift()`s the **oldest** task (`t_a`, the
dead orphan) instead of the live child's task (`t_b`). pid 5 never unblocks → deadlock → timeout.

### Fix
The mock `ResearchService` models an external research backend. A real backend answers every
request it receives; the re-issued request is a legitimate new request. So the resume fiber
should drain **all** pending tasks, not just the oldest. Change `completeOneTask()` →
`completeAllTasks()` in the resume fiber (completing the already-abandoned `t_a` is a harmless
no-op on an unawaited Deferred; completing `t_b` unblocks the live child pid 5).

## Stage 2 — expand persistence/rehydration test coverage (DONE)
Added two complementary AgentService-level cases. Low-level ProcessManager durability
(alarm re-arm, onSpawn idempotency, event redelivery, dormant parent/child) is already
covered in `compute-runtime/src/ProcessManager.test.ts`, so these target the agent stack:
- `rehydrates an idle session and replays conversation history` — full prompt cycle, restart
  (shutdown/startup/hydrate) while idle, then a context-dependent follow-up; asserts the
  rehydrated agent still has the pre-restart turn (feed replay across rehydration).
- `hydrate is a no-op when there are no persisted agents` — reboot over an empty store;
  hydrate neither throws nor blocks and is idempotent (called twice).

Regenerated `AgentService.conversations.json` (whole-file run, ALLOW_LLM_GENERATION=1,
edge-remote preset — no API key needed). All 5 active + 1 skipped tests pass from cache.

## Incidental
- `.gitignore`: added `test.log` (the new vite-plugin-log Vitest NDJSON sink writes per-package
  `test.log`; these were showing as untracked noise on the branch).
