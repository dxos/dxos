# Agent (hypervisor operator) deviations — running log

Behavioral mistakes made while operating the agent-harness, and the correct behavior.
Re-read this before/while operating as the hypervisor. Append new entries; never rewrite history.

## Deviation 1 — Hypervisor did the task itself instead of delegating to `dx agent`

- **Date:** 2026-07-26
- **What happened:** Given a data/dev goal (install IBKR plugin, fetch portfolio, verify
  ECHO import + SEC EDGAR), the hypervisor started executing that goal directly — curling the
  IBKR Flex API, reading operation internals to do the work by hand.
- **Why it's wrong:** The exercise is for the hypervisor to **bootstrap the `dx agent` and keep it
  alive**. Only the `dx agent` (Composer) does the task work; the hypervisor orchestrates, recovers,
  does heavy-lifting the agent defers, and critiques.
- **Correct behavior:** Hand the goal to `dx agent "<goal>"`, sleep, wake, check exit code / progress,
  run the reload gate on `75`, recover on crash/stall, critique — but never do the agent's task work
  yourself. Heavy-lifting the agent explicitly defers (e.g. `pnpm install`, cross-package builds) is
  the exception, and only as part of the reload gate.

## Deviation 2 — Hypervisor stopped/asked when blocked on a transient external condition

- **Date:** 2026-07-26
- **What happened:** The live IBKR fetch returned a transient throttle (`ErrorCode 1001`,
  "statement could not be generated at this time"). The hypervisor stopped, reported the blocker, and
  asked the user whether to retry — leaving the task incomplete.
- **Why it's wrong:** Autonomy rule — **never stop to ask**. A transient, self-clearing external
  condition is not a critical error and not task completion; it's something to wait out.
- **Correct behavior:** Back off and **retry until the dependency is ready** — but the retry is done
  by re-launching `dx agent` (see Deviation 3), not by the hypervisor probing the API. `sleep` on a
  sane interval that respects the provider's rate limits (never a tight loop), then re-launch the
  agent. Only halt when a **critical-error-list** condition occurs or the task is **complete in its
  entire scope**. Keep a journal note each cycle so the wait is auditable.

## Deviation 3 — Hypervisor probed the external API itself instead of driving `dx agent`

- **Date:** 2026-07-26
- **What happened:** While correctly _waiting_ for the IBKR throttle to clear (deviation-2 fix), the
  hypervisor did the waiting by `curl`-ing IBKR's SendRequest directly on a poll loop — i.e. it did
  the task's network work itself. Same root cause as Deviation 1.
- **Why it's wrong:** The `dx agent` performs the fetch (via SyncPortfolioReport). The hypervisor
  must not touch the external API; probing IBKR is task work, not orchestration.
- **Correct behavior:** Drive the loop through the agent: launch `dx agent` to attempt the fetch; if
  it reports the transient failure, **`sleep`** (the hypervisor's only job while waiting) and
  **re-launch the agent** to retry. The agent — not the hypervisor — is the only thing that ever
  contacts IBKR. Keep re-launching on a rate-limit-respecting interval until it succeeds.
