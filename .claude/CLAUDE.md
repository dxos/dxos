# Claude Specific Instructions

## IMPORTANT

- When performing complex tasks maintain a plan.
- NEVER use the `send_later` tool.

## Response mode

- Desktop clients don't expose custom slash commands, so the response-verbosity
  mode is toggled by a sentinel in a normal message: type `$concise` or
  `$natural` (also `$mode concise`) anywhere in a message.
- A `UserPromptSubmit` hook (`.claude/hooks/response-mode.sh`) parses the
  sentinel, sets the mode, and while concise injects a terseness directive into
  every prompt. State lives in the untracked `.claude/.response-mode`.
- When the injected `RESPONSE MODE: CONCISE` directive is present, follow it.

## Task planning

- Record a follow-up task with the `$track <text>` sentinel (anywhere in a
  message) or a line beginning `track: <text>`.
- Manage the project registry (`.agents/projects/registry.yml`) with
  `$project new|list|end <name>`; each project has a `TASKS.md` + `DESIGN.md`.
  Bare `$project` (or `$project list`) prints a numbered table of the current
  user's projects (`list all` for everyone) — reply with a row number to resume.
- Checkpoint project state with `$hydrate` (also `$checkpoint`) before stopping
  or opening a PR; reload a project with `$resume [name]` (also `$rehydrate`) at
  the start of a session — the registry resolves _which_ project (by name, else
  by the entry whose branch matches HEAD).
- A `UserPromptSubmit` hook (`.claude/hooks/track.sh`) detects these and injects
  the matching directive — append to the active `TASKS.md` (never a background
  task chip), manage the registry, or run the hydrate/resume handoff. See the
  `task-planning` skill for the file format, workflow, registry, and handoff steps.
