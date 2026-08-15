---
description: Project tracking — status, tasks, list, new, end, track, hydrate, resume
argument-hint: '[list|tasks|new|end|track|hydrate|resume] [args]'
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

Arguments: `$ARGUMENTS`

`hooks/track.sh` runs on `UserPromptSubmit`, which carries the raw `/dxos:project …`
text and fires before this expansion reaches you, so **a `TASK-PLANNING …`
directive for this invocation is already in your context.** Follow that directive
— it is the authoritative one, generated from the verb you were actually given.

It ends with a `BACKEND:` line naming the store and how to read or write it.
**Obey that line rather than assuming a file path**: the same verbs run against
different stores, and a future backend will not be a file at all.

If no such directive appeared, the verb was not recognised; ask which of
`(bare) | list [all] | tasks [all] | new <name> | end <name> | track <text> | hydrate | resume [name]`
was meant rather than guessing.

Details of the file format, registry schema and handoff steps are in the
`task-planning` skill.
