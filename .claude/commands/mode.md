---
description: Set the response-verbosity mode (terse | normal)
allowed-tools: Bash
---

The mode has ALREADY been applied — `.claude/hooks/mode.sh` runs on
`UserPromptSubmit`, which carries the raw `/mode …` text and fires before this
expansion reaches you. Do not set it yourself; the write is already done.

Report the current mode in one line, from:

```bash
bash .claude/scripts/mode.sh get
```

Arguments: `$ARGUMENTS`. If empty, reporting the current mode is the whole task.
If it named a mode, the `RESPONSE RULES` block in this turn's context already
reflects it — confirm in one line and stop, unless the message clearly carries a
task as well.
