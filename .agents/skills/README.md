# Skills: authoring conventions

Deep, task-specific how-to for agents lives here, one directory per skill with a
`SKILL.md` at its root. `.claude/skills` is a symlink to this directory. Keep
`AGENTS.md` thin; put the detail in a skill.

This file is the settled convention: what we do. The
[`writing-for-agents`](writing-for-agents/SKILL.md) skill is the theory behind
it: context pointers, the two loads, progressive disclosure, completion
criteria, leading words, and pruning.
[`SKILL-MECHANICS.md`](writing-for-agents/SKILL-MECHANICS.md) covers frontmatter
and the invocation choice in detail. Read this file first; reach for those when
you need to decide something this file does not cover. Skills adapted from
external collections are listed in [THIRD-PARTY.md](THIRD-PARTY.md).

## Reference or process: pick one per skill

Every skill is one of two kinds, and mixing them in one document is how skills
get vague. Say which kind a skill is, in its own text, when it isn't obvious.

- A **reference** documents a mechanism: APIs, file layouts, commands, formats.
  It assumes the reader already decided what to do (`echo`, `tracing`,
  `logging`, `moon`).
- A **process** owns a workflow end to end: steps, decision points, and what
  "done" means (`submit-pr`, `land`, `debugging-ui`, `agentic-review`).

The `debugging` / `debugging-ui` pair is the model: `debugging` is
instrumentation mechanics only and says so; `debugging-ui` owns the UI-bug
workflow and calls into it. When a process needs mechanics, link the reference
instead of inlining it.

## Frontmatter

- **`name` matches the directory name.** Other skills and `AGENTS.md` refer to
  skills by the short directory name; a divergent frontmatter name breaks that
  linkage silently.
- **`description` is the trigger.** Write it as "Use when …" with the concrete
  symptoms, file paths, and phrases that should load the skill. It carries the
  entire auto-invocation decision.
- **Gate with `disable-model-invocation: true` only when a prose ask should
  NOT trigger the skill.** The flag is stronger than "don't auto-fire": it
  removes the description from the model's context and hard-blocks model
  invocation, so a plain-English request ("run the review") and UI affordances
  like the Create PR button can never reach a gated skill. Only a typed
  `/<name>` can. Gate pure slash-workflows nobody asks for by accident
  (`agentic-review`, `migrate-oxfmt`). Do NOT gate a skill that is the
  sanctioned handler for a natural-language ask (`submit-pr`, `land`): those
  must stay model-invocable or the ask silently falls back to the generic
  flow, skipping the repo procedure. Add an `argument-hint` when the skill
  takes arguments.

## Paths must stay real

CI-adjacent rot check: `node scripts/check-skill-refs.mjs` verifies that every
markdown link and inline-code repo path in `.agents/skills/**/*.md` resolves.
Run it after editing skills, and fix or repoint what it flags.

- Historical records (incident writeups, dated audits) and vendored upstream
  docs opt out with `<!-- skill-refs: ignore -->` anywhere in the file.
- A line that deliberately names a path that no longer exists opts out with
  `<!-- skill-refs: ignore-line -->` on that line.
- Cite repo files by repo-relative path (`packages/…`); the checker resolves
  those from the root, falling back to the skill's own directory (for a skill's
  bundled `scripts/`).

## Session memory and promotion

A skill may keep a `MEMORY.md` of session-logged corrections (see
`composer-plugins/MEMORY.md` for the format). Memory is a staging area, not a
destination. Promote entries as they stabilize:

1. **Durable guidance** → fold into the skill's `SKILL.md`.
2. **Mechanically checkable rules** (a greppable pattern plus a judgment call)
   → a `rule` block in an `.mdl` file so the `agentic-review` harness enforces
   it on every run; see `agentic-review/SKILL.md` → "Authoring a rule" and
   `agentic-review/rules/composer-plugins.mdl` for the exemplar. Mark the
   promoted bullet with `(→ rule <id>)`.

## Cross-linking

Link sibling skills with relative paths (`../effect/SKILL.md`) so the links
survive checkout location and pass the refs check. Name the division of labor
when two skills share territory, the way `composer-debug` / `composer-forensics`
and `composer-plugins` / `composer-ui` do.

## Prose quality

Skill text is prose an agent reads, so it earns the same passes as anything
else we ship:

- [`writing-for-agents`](writing-for-agents/SKILL.md). Structure and wording
  for agent-facing documents (skills, `AGENTS.md`, the files they point at).
- [`technical-writing`](technical-writing/SKILL.md). Document mode and sentence
  rules for human-facing prose (docs, PR descriptions, changesets).
- [`unslop`](unslop/SKILL.md). The slop-pattern catalog, as a final pass over
  either.
