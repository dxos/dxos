# Worktree Hooks Cleanup — Design

## Why

Two `PreToolUse` guard hooks in `.claude/settings.json` mitigated Claude Desktop
harness quirks from July 2026. Evidence gathered 2026-08-24 suggests the core
product has since fixed the quirk they were written for, so they are disabled on
a trial basis; the scripts remain on disk under `.claude/hooks/`.

## What the guards did

|         | `guard-worktree.sh`                              | `guard-branch.sh`                                                    |
| ------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| Matcher | `Edit\|Write\|MultiEdit\|NotebookEdit`           | `Bash`                                                               |
| Reads   | `.tool_input.file_path`                          | `.tool_input.command`                                                |
| Denies  | editing a file whose working tree HEAD is `main` | `git worktree add`, `checkout -b/-B`, `switch -c/-C`, `branch -m/-M` |
| Hazard  | polluting the shared branch                      | escaping the harness-assigned branch                                 |

Both verified working before removal: an `Edit` against a repo file on `main`
was denied, as was `git worktree add ../foo`.

## Findings that motivated disabling

1. **The stub quirk stopped.** `guard-worktree.sh`'s header documents the failure
   mode: the harness checks the assigned `claude/…` branch out at the primary
   checkout and leaves the worktree path an empty stub. Three such stubs existed
   (`selected-objects-gutter-spacing-957a58`, `plugin-terra-3d-world-e944a4`,
   `ui-component-audit-20f206`) — created Aug 3 and Aug 11, each containing only
   a `.moon` dir and no `.git`. Every worktree created since (Aug 19–24) is
   properly instantiated. Deleted 2026-08-24.

2. **`guard-worktree.sh` was only half-effective.** It matched the Edit-family
   tools but not `Bash`, so `sed -i`, heredocs and redirects wrote to `main`
   unimpeded. Verified by feeding both hooks synthetic tool inputs. In Claude
   Code's auto mode — which instructs the agent to prefer Bash for file edits —
   the guard's coverage gap aligns exactly with the normal workflow.

3. **Both were inert in the session that found this.** `.claude/settings.json` is
   only loaded when cwd is at or below the repo root. The session ran from
   `~/Code/dxos` (one level above `~/Code/dxos/dxos`), so neither guard fired,
   nor did `mode.sh`, nor was `CLAUDE.md` injected. `git worktree add` reached
   git and printed usage rather than being denied.

## The pairing failure has not gone away

It changed shape. The Aug 24 session had **no `claude/…` branch at all** — HEAD
on `main` at the primary checkout, no worktree directory. That is a different
symptom from the stub case but the same family, so `guard-branch.sh` is not
obviously vestigial even if `guard-worktree.sh` is.

## Worktrunk interaction (context, not a change)

Claude Desktop and worktrunk both produce worktrees under
`<repo>/.claude/worktrees/` but only share a namespace, not a lifecycle:

- **Session worktrees** are created by the harness with plain `git worktree add`.
  worktrunk is never consulted.
- **Agent isolation worktrees** (`isolation: "worktree"`) are rerouted: the
  plugin's `WorktreeCreate` hook substitutes `wt switch --create` and reads the
  path back as JSON. `WorktreeRemove` mirrors it.
- The bridge is one line in `~/.config/worktrunk/config.toml`:
  `worktree-path = "{{ repo_path }}/.claude/worktrees/{{ branch | sanitize }}"`.

That template asserts _dirname == sanitize(branch)_. worktrunk guarantees it for
worktrees it creates; the harness does not — 6 of 10 disagreed on 2026-08-24.
`wt list` still sees them (it reads git), and `wt remove` still removes them (it
accepts a path as well as a branch), but path-templated operations cannot resolve
them.

**This is documented as intended.** `CLAUDE.md`: _"the branch is named after the
originating prompt, not the worktree directory, so the two names routinely differ
and that is NOT a fault to 'correct'."_ The `task-planning` skill repeats it:
never warn about a worktree/branch mismatch on resume. A user request for the two
to match therefore conflicts with a stated non-negotiable and needs a decision
rather than a fix.

## Cleanup heuristics compared

For deciding which worktrees are dead, two signals were tested:

- **`main_state == "integrated"`** (used by the user's `w --clean` zsh function)
  — the branch's work has landed in `main`. Correct: safe to delete regardless of
  recency.
- **Last session mtime** (from `~/.claude/projects/<encoded-cwd>/*.jsonl`) —
  measures attention, not whether work survived. It would have deleted a
  `diverged` worktree with unmerged commits and kept an `integrated` one used
  ten hours earlier.

Recency is the wrong axis; `main_state` is right. Where the session correlation
does help is the two classes `wt` cannot see: unregistered stub directories, and
orphaned project dirs under `~/.claude/projects` whose worktree is already gone.

## References

- `.claude/hooks/guard-worktree.sh`, `.claude/hooks/guard-branch.sh` (retained)
- `~/.claude/plugins/marketplaces/worktrunk/plugins/worktrunk/hooks/hooks.json`
- worktrunk agent integration doc: `skills/worktrunk/reference/claude-code.md`
- `~/Code/richburdon/config/dotfiles/.config/zsh/scripts/git.zsh` — `w()` / `w --clean`
