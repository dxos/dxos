# task-planning Skill — Tasks

_Resume: commit the `$session`→`$project` rename + `$project` picker (5 files). Uncommitted: SKILL.md, TASKS.md, .claude/CLAUDE.md, .claude/hooks/track.sh, AGENTS.md, and the `.agents/sessions`→`.agents/projects` rename. Last: renamed the sentinel/concept and added the numbered pick-to-resume table._

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
