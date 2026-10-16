# Usability probe: four projects (2026-10-16 17:30 UTC)

A Haiku agent was given only `scripts/visit.mjs` and the hub URL, after `@dxos/web` was published (D211),
results reached the hub (D209) and the native interpreter started counting references (D213). Fourteen page
visits.

## What it understood

> DEUS is a programming language whose code lives in a hash-addressed codebase rather than in files. This site
> is an explorer for four projects (about 7,962 definitions). Each project page shows its types, terms, tests,
> theorems, spec documents, checks and tasks.

Path: hub → `@dxos/base` → Glossary → `@dxos/toolchain` → `Tour` → Tasks → `@dxos/examples` → `Sort.wrongClaim`
→ `@dxos/web` → `TodoApp` → `TodoApp.Spec` → History → `Compile.Spec` → `https://dxos.org/deus/base` (404).

## What it found wrong

1. Definition counts do not reconcile: the hub's 7,962 in 4 projects, the toolchain's "3385 definitions (396
   from libraries)", and "toolchain 2955 definitions" on the web page.
2. `@dxos/web` says "✗ 18/19 checks pass", but its failing-checks row for `Rendered.renderedSmall` shows a
   green ✓.
3. `Sort.wrongClaim` fails on purpose, and nothing on the overview or its page says so.
4. The list glyphs (●, ◇, ◎) are not in the glossary.
5. Task text cites D85, D181, D190 with no link.
6. History rows leak scratch paths (`update /tmp/claude-0/…/ff.deus`), and many read only
   `task: set 1ab6c044 state`.
7. `TodoApp` points to `examples/react/index.html`, a repository path the site cannot serve.
8. `TodoApp.Spec` says "2 of 2 requirements name their tests" beside a feature with no test.
9. `Compile.Spec` cites LANGUAGE.md and CORE.md, outside the site.
10. The `lib install base` history line links `https://dxos.org/deus/base`, which is a 404.

## Its three changes

1. A "how to read this" panel on the hub: the glyphs, what the check count means, a first path.
2. Honest, consistent status: ✗ on failing rows, intentional failures labelled, counts that agree.
3. No dead or leaked references: library links that resolve, no repository or scratch paths, D-numbers
   linked to the decision log.
