---
description: Task-planning projects — list, new, end, track, hydrate, resume
argument-hint: '[list|new|end|track|hydrate|resume] [args]'
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

Arguments: `$ARGUMENTS`

`.claude/hooks/track.sh` runs on `UserPromptSubmit`, which carries the raw
`/project …` text and fires before this expansion reaches you, so **a
`TASK-PLANNING …` directive for this invocation is already in your context.**
Follow that directive — it is the authoritative one, generated from the verb you
were actually given.

If no such directive appeared, the verb was not recognised; ask which of
`(bare) | list [all] | new <name> | end <name> | track <text> | hydrate | resume [name]` was
meant rather than guessing.

Details of the file format, registry schema and handoff steps are in the
`task-planning` skill.
