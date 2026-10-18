# Usability probe: libraries and results (2026-10-16 13:40 UTC)

A Haiku agent was given only `scripts/visit.mjs` and the hub URL, after D206 (base mounted as a library),
D209 (results on the hub and explorer) and D210 (refuted probes). Fourteen page visits.

## What it understood

> DEUS is a programming language whose code lives in a content-addressed codebase instead of files, with each
> definition stored by its hash alongside its history, specs, tests and tasks. The site is a read-only explorer
> for those codebases, with three projects: `@dxos/base` (library), `@dxos/examples`, and `@dxos/toolchain`.

Path: hub → `@dxos/toolchain` → `Tour` → `Tour.total` → its test `Tour.totals` (✓ Passes) → `Check` →
`Check.checkerId` → Tasks → `@dxos/examples` → `Sort.wrongClaim` → glossary → `Compile.Spec` → History → `@dxos/base`.

## What it found wrong

1. It could not find the toolchain's one failing check: the overview has no list of failing checks.
2. `Sort.wrongClaim` fails on purpose, and nothing on its card says so.
3. Change titles leak sandbox paths (`update /tmp/claude-0/…/scratchpad/ff.deus`), and one is a raw dump of 392
   names (`delete Actors Alarm Array …`).
4. List summaries stop mid-sentence ("…which the").
5. The glossary points to `docs/DECISIONS.md in the repository`, which a visitor cannot open.
6. Spec glyphs run into names ("SNotes.QA").
7. A theorem's type reads `Int -> List Int -> a`.

## Its three changes

1. A start-here card naming the entry point, and the failing checks listed by name, intentional ones labelled.
2. No sandbox paths in change titles, a summary instead of a giant delete message, no mid-sentence truncation.
3. Link or drop the repository-only pointer; fix requirement order in spec documents.
