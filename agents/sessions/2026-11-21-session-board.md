# Session board skill

The agent writes Markdown. A script makes the page. The agent publishes it.

## Questions

- [open] Is `agents/sessions/` the correct place for board files?
  - Option 1: Yes. The board is committed with the work.
  - Option 2: Use `.agents/sessions/`, beside the project registry.
- [open] Must the Stop hook block the stop, or only show a note?
  - Option 1: Block one time for each change. The agent then publishes.
  - Option 2: Show a note only. The page can then be old.
- [open] Must the script get the PR state from GitHub?
  - Option 1: Yes, on each build. The agent writes only the PR number.
  - Option 2: No. The agent writes the state.
- [open] Is a new skill name necessary?
  - This work replaces the old `status-board` skill, which wrote HTML by hand.

## Goals

- [done] Parse the board Markdown and report errors with line numbers.
  - `tools/session-board/src/parse.ts`, with 7 tests.
  - Word limits: 12 for an item, 25 for a detail.
- [done] Check each line with the STE checker.
  - Findings are warnings. `--strict` makes them errors.
- [done] Fill a prebuilt react-ui page without a bundler.
  - One build takes approximately 0.1 s.
  - The page uses `Accordion`, `Tag` and `Typography`.
- [done] Publish the page after each change from the Stop hook.
  - The hook blocks the stop one time for each change of content.
  - With no board, the hook stops before node starts.
- [doing] Cache the prebuilt page in R2.
  - The **Session Board Cache** workflow pushes it from `main`.
  - It runs only after this work merges.
- [todo] Open a draft PR.

## Pull requests
