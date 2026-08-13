# Review staging — agentic-code-review-3wrnts-e8ad2af114

- base: `50877ea571c434fec6f31fc0c57201c924fb9981`
- head: `e8ad2af1144c55b4023a729147c3c40148486a31`
- mode: default
- groups: 2 (max 20)
- files: 2

Each group below is one rule over a bounded set of files. A subagent
reviews its files against the rule and appends diagnostics to the named fragment.

## Group 01 — Harness scripts stay dependency-free and honest (`harness-script-hygiene`, severity: warn)

<!-- fragment: groups/01.md -->

**Scope:** changed since `50877ea571c434fec6f31fc0c57201c924fb9981`

**Rule instructions:**

Review the agentic-review harness's own `.mjs` scripts for tooling hygiene, not
TypeScript type rules (these are plain Node ESM). Flag: a `catch` that swallows
an error so a real failure passes silently (as opposed to a deliberate,
commented best-effort skip); dead or unreachable code and unused
bindings/exports; comments that restate what the code does instead of the
constraint behind it (why); and any new runtime dependency import beyond
`node:*` builtins, since these scripts must run standalone under pnpm. Do not
flag deliberate, clearly-commented tolerations (e.g. best-effort git calls).

**Files to review (1):**

- `.agents/skills/agentic-review/lib/discover.mjs`

## Group 02 — Harness scripts stay dependency-free and honest (`harness-script-hygiene`, severity: warn)

<!-- fragment: groups/02.md -->

**Scope:** changed since `50877ea571c434fec6f31fc0c57201c924fb9981`

**Rule instructions:**

Review the agentic-review harness's own `.mjs` scripts for tooling hygiene, not
TypeScript type rules (these are plain Node ESM). Flag: a `catch` that swallows
an error so a real failure passes silently (as opposed to a deliberate,
commented best-effort skip); dead or unreachable code and unused
bindings/exports; comments that restate what the code does instead of the
constraint behind it (why); and any new runtime dependency import beyond
`node:*` builtins, since these scripts must run standalone under pnpm. Do not
flag deliberate, clearly-commented tolerations (e.g. best-effort git calls).

**Files to review (1):**

- `.agents/skills/agentic-review/scripts/prepare.mjs`
