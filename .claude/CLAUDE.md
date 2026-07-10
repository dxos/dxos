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

## Task tracking

- Record a follow-up task with the `$track <text>` sentinel (anywhere in a
  message) or a line beginning `track: <text>`.
- A `UserPromptSubmit` hook (`.claude/hooks/track.sh`) detects it and injects a
  directive to append the item to the active `TASKS.md` (the package or
  directory being worked in) — never a background task chip. See the
  `task-tracking` skill for the file format and workflow.
