# Review staging — agentic-code-review-3wrnts-31612f6b

- base: `76ce5607cd57027b2f0995775debb5bb84abbef8`
- head: `31612f6b9ec09d1e16652ae51ded2298a89a7aee`
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

**Files to review (2):**

- `.agents/skills/agentic-review/lib/discover.mjs`
- `.agents/skills/agentic-review/lib/git.mjs`
