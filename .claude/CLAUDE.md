# Claude Specific Instructions

## IMPORTANT

- When performing complex tasks maintain a plan.
- NEVER use the `send_later` tool.

## Response mode

- `/concise` toggles a very-concise response mode on/off (a `UserPromptSubmit`
  hook injects a terseness directive while active; state lives in the untracked
  `.claude/.response-mode`). When the injected `RESPONSE MODE: CONCISE` directive
  is present, follow it.
