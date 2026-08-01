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

- One sentinel: `$project VERB [ARGS]` anywhere in a message; a
  `UserPromptSubmit` hook (`.claude/hooks/track.sh`) detects it and injects the
  matching directive.
  - `$project` / `$project list [all]` — numbered table of the registry
    (`.agents/projects/registry.yml`); reply with a row number to resume.
  - `$project new <name> [summary]` / `$project end <name>` — manage entries;
    each project has a `TASKS.md` + `DESIGN.md`.
  - `$project track <text>` — record a follow-up in the active `TASKS.md`
    (never a background task chip).
  - `$project hydrate` (alias `checkpoint`) — checkpoint before stopping or
    opening a PR.
  - `$project resume [name]` — reload state at session start, always in the
    session's assigned worktree.
- Legacy `$track`/`$hydrate`/`$resume` forms map to the same directives.
- See the `task-planning` skill for the file format, workflow, registry, and
  handoff steps.
