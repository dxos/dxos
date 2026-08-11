# Review staging — agentic-code-review-3wrnts-76ce5607

- base: `b217ecc635789558ffd43623e2ef1a215a049e3f`
- head: `76ce5607cd57027b2f0995775debb5bb84abbef8`
- groups: 1

Each group below is one rule over a bounded set of changed files. A subagent
reviews its files against the rule and appends diagnostics to the named fragment.

## Group 01 — Harness scripts stay dependency-free and honest (`harness-script-hygiene`, severity: warn)

<!-- fragment: groups/01.md -->

**Rule instructions:**

Review the agentic-review harness's own `.mjs` scripts for tooling hygiene, not
TypeScript type rules (these are plain Node ESM). Flag: a `catch` that swallows
an error so a real failure passes silently (as opposed to a deliberate,
commented best-effort skip); dead or unreachable code and unused
bindings/exports; comments that restate what the code does instead of the
constraint behind it (why); and any new runtime dependency import beyond
`node:*` builtins, since these scripts must run standalone under pnpm. Do not
flag deliberate, clearly-commented tolerations (e.g. best-effort git calls).

**Files to review (8):**

- `.agents/skills/agentic-review/lib/diagnostics.mjs`
- `.agents/skills/agentic-review/lib/discover.mjs`
- `.agents/skills/agentic-review/lib/frontmatter.mjs`
- `.agents/skills/agentic-review/lib/git.mjs`
- `.agents/skills/agentic-review/lib/mdl.mjs`
- `.agents/skills/agentic-review/lib/store.mjs`
- `.agents/skills/agentic-review/scripts/finalize.mjs`
- `.agents/skills/agentic-review/scripts/prepare.mjs`
