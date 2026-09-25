---
description: Run a task to completion without asking questions (autonomous mode)
argument-hint: '[task | off [reason] | status]'
allowed-tools: Bash
---

Arguments: `$ARGUMENTS`

**Never set the state yourself.** `.claude/hooks/autonomous.sh` runs on
`UserPromptSubmit`, which carries the raw `/autonomous …` text and fires before
this expansion reaches you, so the write is already done. The `AUTONOMOUS MODE`
block in this turn's context is the source of truth for what is pinned.

**If `$ARGUMENTS` named a task** (or was empty, in which case the task was
adopted from your previous instruction), the run is now ON. Before touching
anything:

1. Restate the task in one line — with a derived task this is the user's only
   chance to correct it.
2. Write a **definition of done**: a short checklist of _verifiable_ conditions,
   not intentions. What builds, what test passes, what a reviewer can see, what
   is committed. Store it, because the Stop hook quotes it back to you:

   ```bash
   bash .claude/scripts/autonomous.sh dod set '1. … 2. … 3. …'
   ```

3. Then work it to completion. Ask nothing. Every non-obvious choice gets a line
   in the decision log as you make it:

   ```bash
   bash .claude/scripts/autonomous.sh log add '<decision> — <why>'
   ```

Read the `autonomous-mode` skill (`.agents/skills/autonomous-mode/SKILL.md`) for
how to resolve a question without asking, what counts as trying to get around a
blocker, and the adversarial review expected before you stop.

**If `$ARGUMENTS` began with `off`, `stop` or `end`**, the run is already over
and the reason is in the log. Confirm in one line and report where the task
stands — what is done, what is not, what you would do next.

**If `$ARGUMENTS` was `status`**, report from the `AUTONOMOUS MODE` block plus:

```bash
bash .claude/scripts/autonomous.sh get; bash .claude/scripts/autonomous.sh dod get; bash .claude/scripts/autonomous.sh log show 20
```

If no `AUTONOMOUS MODE` block appears in this turn, no run is active — say so.

**If nothing could be pinned** (no task on the line and no previous
instruction), the hook says so and started nothing. Say that in one line and ask
what the task is — this is the one question autonomous mode permits, because
there is no run yet to forbid it.
