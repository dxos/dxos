# Claude Specific Instructions

## IMPORTANT

- When performing complex tasks maintain a plan.
- NEVER use the `send_later` tool.

## Mode

- The response-verbosity mode is toggled by a sentinel in an ordinary message:
  type `$mode terse` or `$mode normal` anywhere in a message. The bare one-token
  forms still work, and `concise` aliases `terse` while
  `natural`/`default`/`off` alias `normal`.
- A `UserPromptSubmit` hook (`.claude/hooks/mode.sh`) parses the sentinel, sets
  the mode, and while terse injects a terseness directive into every prompt.
  State lives in the untracked `.claude/.mode`.
- When the injected `MODE: TERSE` directive is present, follow it.

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
- Legacy `$track`/`$hydrate`/`$checkpoint`/`$resume`/`$rehydrate` forms map to
  the same directives.
- See the `task-planning` skill for the file format, workflow, registry, and
  handoff steps.
