---
name: perf
description: >-
  Find, reproduce, measure and fix Composer performance problems with the `pnpm perf` CLI. Use when
  asked whether a change made the app faster or slower, to make a perf metric better, to turn a
  field report ("X is slow") into a reproducible scenario, to chase memory growth, or to shrink
  what boot loads. Not for a slow or leaking node test suite (test-perf-leaks).
---

# Perf

`pnpm perf` (`packages/e2e/perf-harness/src/cli/`) is the only way to measure. It builds, serves and
drives the app, pairs the arms, does the statistics and prints a verdict. Every perf claim in a
PR, task or reply quotes its output: the verdict, the interval, the rounds and the run directory.
A number from a single run, a devtools recording or a stopwatch is a lead, never a result.

## Pick the workflow

| The question                                                  | Read                         |
| ------------------------------------------------------------- | ---------------------------- |
| Something is slow; which thing, and can we see it here?       | [TRIAGE.md](TRIAGE.md)       |
| A user or the field says X is slow; make X reproducible       | [REPRO.md](REPRO.md)         |
| Make one metric better, keep what helps, revert what does not | [HILLCLIMB.md](HILLCLIMB.md) |
| Memory grows, or a tab is too big                             | [MEMORY.md](MEMORY.md)       |
| Boot loads too much, or ready is late                         | [BOOT.md](BOOT.md)           |
| A node test suite is slow or leaks                            | `test-perf-leaks` skill      |

## The commands

```bash
pnpm perf doctor                                  # ports, load, lock, tree; exit 4 if blocked
pnpm perf run -n 3                                # the working tree, scored against the budgets
pnpm perf compare --base main --metric '<id>'     # did HEAD change <id>? exit code is the verdict
pnpm perf compare --base HEAD                     # A/A: this machine's noise floor
pnpm perf summarize [<run>]                       # where the CPU went, or what changed between arms
pnpm perf expand <handle>                         # one summary row's callers and callees
pnpm perf capture --attach <port>                 # profile an app someone is running
pnpm perf scenario new|check <name>               # a reproduction of a field report
pnpm perf freeze / thaw                           # pin the harness for a loop
pnpm perf ledger                                  # what this worktree measured before
```

`compare` exits 0 improved, 1 regressed, 2 no change, 3 inconclusive, 4 could not measure.
Inconclusive means more rounds (`--max-rounds`), or fewer targets, not a different reading.

## Rules

- **Commit, then compare.** `compare` refuses uncommitted changes, since each attempt is a commit
  the ledger can name. `run` measures the working tree as it stands.
- **Leave tracked files alone while `compare` builds.** It patches the tree to the base and back;
  an edit in between fails the restore.
- **Never edit the harness to get a result.** A change to anything listed under `harness` in
  `packages/e2e/perf-harness/src/cli/targets.ts` (the harness package, the specs, budgets and
  budget scripts) voids a verdict. A harness change is its own PR.
- **Name the target.** One to three `--metric` patterns per question. Every extra target widens
  every interval.
- **Check correctness first.** Pass `--check 'moon run <project>:test'`. A stage that stopped doing
  its work wins every timing; `compare` lists work counters that fell by half, and those come first.
- **One measurement per machine.** The lock serializes worktrees; wait for it, never kill it.
