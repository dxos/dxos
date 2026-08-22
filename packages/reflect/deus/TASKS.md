# DEUS — Task Ledger

Project: `deus` · Design: [docs/DESIGN.md](./docs/DESIGN.md) · Idioms: [docs/IDIOMS.md](./docs/IDIOMS.md)

Extend the DEUS pattern-specification language. The design doc is the spec; this file is the ledger.

## State of the package (as read 2026-08-22)

- [lang/core.mdl](./lang/core.mdl) — the only materialized dialect. Document format, the `ext`
  primitive, primitive types, resolution rules.
- [docs/DESIGN.md](./docs/DESIGN.md) — describes `Deus.Std` (`type`, `op`, `feat`/`req`, `test`,
  `component`, `service`, `db`) and `Deus.DXOS` (`echo-type`, `composer-plugin`, `effect-op`) **in
  prose only** — neither dialect exists as a `.mdl` file.
- [lang/examples/](./lang/examples/) — chess trilogy; each file declares its own inline `ext` blocks.
- [src/extension/](./src/extension/) — Lezer grammar, syntax, lint, completion. Hand-written; any
  core-syntax change lands here too.

## Phase 0 — Scope

- [ ] Fix the extension target with the user. Options on the table:
  1. Core syntax (`core.mdl`) — nesting, imports, constraints, richer `TypeExpr`.
  2. Materialize `Deus.Std` as `lang/std.mdl` from the DESIGN.md prose.
  3. Materialize `Deus.DXOS` as `lang/dxos.mdl` (incl. `idiom-ref` from IDIOMS.md).
  4. Resolve a DESIGN.md open question: standalone `req`, `db` vs `service`, the registry,
     ext versioning, the agent contract.
- [ ] Identify the driving use case — the document that could not be expressed.
- [ ] Decide whether the CodeMirror extension follows in the same change.

## Backlog (from DESIGN.md "Open Questions")

- [ ] `req` as a standalone addressable block vs. inline-only inside `feat`.
- [ ] `db` vs `service` — does persistence deserve its own construct?
- [ ] Registry shape for URI resolution (JSON index? git repo of `.mdl`?).
- [ ] Extension versioning — can a doc pin `type@1.0` while a sibling uses `type@2.0`?
- [ ] Agent contract — the precise interface between a spec and an implementing agent.
