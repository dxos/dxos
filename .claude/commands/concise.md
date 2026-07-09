---
description: Toggle very-concise response mode on/off
allowed-tools: Bash(bash .claude/scripts/response-mode.sh:*)
model: haiku
---

Toggle the response verbosity mode, then stop.

Run exactly this and nothing else:

```bash
bash "${CLAUDE_PROJECT_DIR:-.}/.claude/scripts/response-mode.sh" toggle
```

Report the new mode in a single short line (e.g. `Concise mode ON.` or
`Concise mode OFF — natural responses.`). Do not do any other work. The mode
takes effect on the next message.
