# task-planning Skill — Tasks

_Resume: test the skill in a new repo (see Follow-ups). Uncommitted: none. Last: unified all sentinels under `$project VERB [ARGS]` and hardened session-start safety._

## Sentinel rename + picker

Renamed the `$session` sentinel and "session" work-stream concept to `$project`
(full rename), and made bare `$project` list the registry as a numbered table you
resume from by row number.

### Tasks

- [x] **Rename `$session`→`$project` (full concept rename)** — SKILL.md,
      registry (`.agents/sessions`→`.agents/projects`, `sessions:`→`projects:`),
      track.sh, .claude/CLAUDE.md, AGENTS.md. "session" kept only where it means a
      Claude conversation.
- [x] **`$project` picker** — bare `$project`/`$project list` renders a numbered
      markdown table; replying with a row number resumes that project (in-context, no
      bare-number hook). Verified hook fires on bare/`list`/`new`, silent on `$projects`.

## Unified `$project VERB` sentinel + session-start hardening (2026-08-01)

One sentinel for everything: `$project VERB [ARGS]` (list | new | end | track |
hydrate | resume); legacy `$track`/`$hydrate`/`$resume` map with a nudge. Resume
gained an explicit "stay in the assigned worktree" rule after a real session
adopted another project's worktree via `$resume`.

### Tasks

- [x] **Unify sentinels under `$project`** — track.sh rewrite (verb dispatch,
      punctuation-safe parsing, soft unknown-verb directive), SKILL.md,
      .claude/CLAUDE.md. Verified all verbs + legacy forms + prose false-fire.
- [x] **Resume never leaves the assigned worktree** — rule added to the registry
      note, the resume steps, and the injected resume directive.
- [x] **CPD fallback harmonized** — all four hook commands in
      .claude/settings.json now fall back to `git rev-parse --show-toplevel`.
- [x] **Global session-start layer** (`~/.claude/hooks/`, outside the repo) —
      session-context.sh (SessionStart verdict injection), branch-beacon.sh
      (silent-unless-drifted UserPromptSubmit), dxos-gated guard mirrors;
      motivated by stub worktrees that load no project files at all.

## Follow-ups

### Tasks

- [ ] **Test the skill in a new repo**
  - Copy `SKILL.md` into a clean repo (outside the dxos monorepo, no existing
    TASKS.md convention).
  - Run a realistic multi-step task; confirm the skill triggers and produces a
    well-formed `TASKS.md`.
  - Optionally apply the writing-skills TDD method: baseline pressure scenario
    without the skill, then with it, and confirm behavior changes.
  - Fold any gaps/rationalizations back into `SKILL.md`.
