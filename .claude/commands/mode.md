---
description: Show or set the response-verbosity mode (terse | normal)
argument-hint: '[terse|normal]'
allowed-tools: Bash
---

Arguments: `$ARGUMENTS`

**Never set the mode yourself.** `.claude/hooks/mode.sh` runs on
`UserPromptSubmit`, which carries the raw `/mode …` text and fires before this
expansion reaches you, so any write is already done.

Run this first — it is the source of truth for the report:

```bash
bash .claude/scripts/mode.sh get; git rev-parse --show-toplevel; git branch --show-current; ls -1 AGENTS.md .claude/CLAUDE.md ~/.claude/CLAUDE.md 2>/dev/null
```

**If `$ARGUMENTS` named a mode**, it is already applied and this turn's
`RESPONSE RULES` block already reflects it — confirm in one line and stop, unless
the message clearly carries a task as well.

**If `$ARGUMENTS` is empty**, this is a re-orientation request. Reply with
exactly these four things and nothing else:

1. The worktree directory and branch, from the command above.
2. The instruction files in play: those listed by the command, plus every skill
   (`.agents/skills/*/SKILL.md`) you have actually loaded this session. Name what
   you really consulted — not the full catalogue of what exists.
3. The current mode, from the command above.
4. A numbered list of the modes to switch to, each with its one-line effect and
   the command that selects it:
   1. `/mode terse` — at most 8 lines, minimal markdown.
   2. `/mode normal` — no line budget, length proportionate to the request.

This is the intended way to re-orient mid-session: the worktree line is a
first-reply rule, deliberately not re-injected every turn, so `/mode` on its own
is how you ask for it again.
