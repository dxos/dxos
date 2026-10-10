# Hillclimb: make one metric better

A loop of small attempts, each measured against the last kept one, kept only on an `improved`
verdict. The loop ends at the target, at the attempt budget, or when ideas run out, never at the
first `no change`.

## Before the first attempt

1. Write down the target: the metric id, today's value, the number to reach if one is known, and
   the attempt budget (at least five attempts before giving up).
2. Know the noise. `pnpm perf compare --base HEAD --metric '<id>'` must not call a change.
   `no change` means the metric resolves in the rounds you can afford; `inconclusive` means it does
   not, so raise `--max-rounds` or pick a work counter. A called change means the machine is too
   busy to measure on; wait.
3. Pin the harness: `pnpm perf freeze`. Edits to it are refused until `pnpm perf thaw`.

## Each attempt

1. Read before guessing: `pnpm perf summarize` on the last run, then `expand` the top rows. Target
   a function the profile names.
2. Make one change. Commit it with the idea in the subject line.
3. Measure against the last kept commit:

   ```bash
   pnpm perf compare --base <kept> --metric '<id>' --check 'moon run <project>:test'
   ```

   Add `--scenario <name>` when the metric belongs to a scenario rather than the projects flow.

4. Act on the exit code:
   - `0` improved: keep it; it is the new `<kept>`.
   - `1` regressed or `2` no change: revert the commit (`git revert --no-edit HEAD`), and record
     why it did not help.
   - `3` inconclusive: re-run with more rounds before deciding; never keep on a hunch.
   - `4` could not measure: fix the cause `compare` printed; it is not a verdict.
5. Read the rest of the output. A work counter that fell by half, or an "implausible?" flag, means
   the change probably skipped work rather than doing it faster. Check before keeping.

## Record every attempt

`pnpm perf ledger` keeps the measured rows. On the task, add one line per attempt: the commit, the
idea, the verdict and the shift with its interval. Failed ideas are worth as much as kept ones;
the next session should not try them again.

## Finish

`pnpm perf thaw`. Squash the kept commits into the PR and quote the final
`compare --base main` output in it: verdict, shift, interval, rounds.
