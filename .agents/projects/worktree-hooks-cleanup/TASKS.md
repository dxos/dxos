# Worktree Hooks Cleanup — Tasks

_Resume: watch for guard-hook regressions over the next few days, then either delete the scripts or restore the hooks. Uncommitted: none. Last: disabled both PreToolUse guards in d55b388cdd, pushed to origin/claude/worktree-hooks-cleanup._

## Phase 1: Disable the guards on trial

The two `PreToolUse` hooks mitigated harness quirks that appear fixed. Disabled
rather than deleted so restoring them is a settings change only. See `DESIGN.md`
for the evidence.

### Tasks

- [x] **Audit both guard hooks** — verified each denies what it claims (Edit on `main`; `git worktree add`), and that `guard-worktree.sh` does NOT cover Bash writes.
- [x] **Establish whether the stub quirk still occurs** — last stub Aug 11; all worktrees since Aug 19 properly instantiated.
- [x] **Unregister both hooks** — removed `.hooks.PreToolUse` from `.claude/settings.json`; scripts retained. Commit `d55b388cdd`.
- [ ] **Trial period — watch for regressions.**
  - Watch for: an edit landing on `main`, or a branch/worktree created without being asked.
  - If clean after a few days → delete `guard-worktree.sh` (its coverage gap makes it misleading) and decide separately on `guard-branch.sh`.
  - If a regression appears → restore `.hooks.PreToolUse` and record which guard caught it.
- [ ] **Decide `guard-branch.sh`'s fate independently.** It is cheap, complete for its hazard, and enforces "never switch worktrees unless asked". The case for keeping it is stronger than for its sibling.

## Phase 2: Worktree visibility (goals 5 + 6)

The statusline is the only always-on readout of which worktree a session is in.
It currently goes silent in exactly the case where it matters.

### Tasks

- [ ] **Make the missing-worktree case render loudly** in `~/.claude/status-line.sh`.
  - Today: `if [ -n "$worktree_name" ]; then parts+=("⧉ $worktree_name"); fi` — the segment disappears when there is no worktree.
  - Want: `⚠ NO WORKTREE` when `.worktree.name` is empty, so a mis-instantiated session is visible at a glance.
  - Note this file lives in `~/.claude`, outside the repo — not covered by this branch.
- [ ] **Use that readout to answer "when is the worktree created?"**
  - Open question: creation is sometimes immediate, sometimes after the first commands land.
  - Once the statusline always renders worktree state, the transition is directly observable rather than inferred.
- [ ] **Consider `wt list statusline --format=claude-code`** as an alternative — ships with worktrunk, adds diff counts, CI and rate-limit pace. Currently unused; `statusLine` points at the hand-rolled script.

## Phase 3: Naming conflict (goal 7)

- [ ] **Decide: should the worktree directory match its branch name?**
  - User wants them to match; it is what `wt`'s path template assumes.
  - `CLAUDE.md` says the opposite — they "routinely differ and that is NOT a fault to 'correct'" — and the `task-planning` skill says never to warn about a mismatch on resume.
  - This is a conflict between a user requirement and a stated non-negotiable, not a bug to fix. Needs a decision before anyone acts.
  - Consequence if left as-is: 6 of 10 worktrees are addressable by path but not by branch through `wt`'s template.

## Phase 4: Disk hygiene

- [x] **Delete unregistered stub directories** — 3 dirs, 40M, no `.git`, invisible to `wt remove`.
- [x] **Reclaim merged worktrees** — user ran `w --clean`, freeing ~16.5G (55G → ~30G).
- [ ] **Delete orphaned project dirs** under `~/.claude/projects` whose worktree no longer exists.
  - 62 dirs / 278 transcripts / ~836M as of 2026-08-24.
  - Archived first: `~/.claude/projects-orphaned-2026-08-24.tar.gz` (165M, verified).
  - Blocked: bulk `rm -rf` inside `~/.claude` is denied to the agent by the auto-mode classifier; the user must run it.
  - `cd ~/.claude/projects && for d in *--claude-worktrees-*; do n="${d##*--claude-worktrees-}"; [ -d "/Users/burdon/Code/dxos/dxos/.claude/worktrees/$n" ] || rm -rf "./$d"; done`

## Notes for a resuming session

- **This project's own branch was created by hand.** The Aug 24 session was
  mis-instantiated (HEAD on `main` at the primary checkout, no assigned branch),
  and the user explicitly asked for `claude/worktree-hooks-cleanup` — which
  `guard-branch.sh`'s own text permits ("unless the user explicitly asks").
  Do not treat this as precedent; the harness owns branches.
- **Do not adopt this branch's worktree.** Per `task-planning`, continue in
  whatever worktree this session is assigned. The branch is pushed; work from it
  there.
- **Two agent-blocked actions** are recorded above (settings edit, bulk delete).
  Both denials look correct — an agent editing its own guardrail config, and mass
  deletion inside `~/.claude`. Hand them to the user rather than routing around.

### References

- `DESIGN.md` — evidence, the worktrunk interaction, and the heuristic comparison.
- Commit `d55b388cdd` — the hook change.
- Artifact (2026-08-24): https://claude.ai/code/artifact/0cbd8941-4af0-41d4-ad81-1687a84aedc0
