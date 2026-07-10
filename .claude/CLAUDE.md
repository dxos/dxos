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
