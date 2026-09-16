---
description: Show or set the response mode (terse | normal | focus [task])
argument-hint: '[terse|normal|focus [task]]'
allowed-tools: Bash
---

Arguments: `$ARGUMENTS`

**Never set the mode yourself.** `.claude/hooks/mode.sh` runs on
`UserPromptSubmit`, which carries the raw `/mode …` text and fires before this
expansion reaches you, so any write is already done.

Run this first — it is the source of truth for the report:

```bash
bash .claude/scripts/mode.sh get; bash .claude/scripts/mode.sh focus get; git rev-parse --show-toplevel; git branch --show-current; ls -1 AGENTS.md .claude/CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null
```

**If `$ARGUMENTS` named a mode**, it is already applied and this turn's
`RESPONSE RULES` block already reflects it — confirm in one line and stop, unless
the message clearly carries a task as well.

**If `$ARGUMENTS` began with `focus`**, the mode is now TERSE and a task is
pinned — the `FOCUS:` line in this turn's `RESPONSE RULES` block is the pin, and
it is the whole of what you may work on. With a task on the line, acknowledge in
one line and start it. With no task on the line the pin was derived from your
previous instruction, so restate it in one line first — that is the user's only
chance to correct a wrong pin. If the block carries no `FOCUS:` line, nothing
could be pinned: say so and ask what to pin.

**If `$ARGUMENTS` is empty**, this is a re-orientation request. Reply with
exactly these three things and nothing else:

1. The worktree directory and branch, from the command above.
2. The instruction files in play: those listed by the command, plus every skill
   (`.agents/skills/*/SKILL.md`) you have actually loaded this session. Name what
   you really consulted — not the full catalogue of what exists.
3. The current mode, from the command above, and the other mode's command on the
   same line (`/mode terse` | `/mode normal`). If a task is pinned, name it and
   say that `/mode terse` or `/mode normal` clears it.

Do **not** offer the modes as a numbered list. A numeric reply is the one form
the `UserPromptSubmit` hook cannot catch, so it would invite an answer that
silently bypasses the deterministic write.

This is the intended way to re-orient mid-session: the worktree line is a
first-reply rule, deliberately not re-injected every turn, so `/mode` on its own
is how you ask for it again.
