# URL & Deck Redesign — Design

Composer's URL structure and deck-layout state model are being redesigned
together: URLs move to Macro-style chained `(prefix, id)` pairs anchored by a
`/w/<workspaceId>` workspace base with mid-chain rebasing, the
`NavigationPathResolver` capability dissolves into the graph builder via a
static, global `urlKey` table, and the deck collapses from three explicit
modes to a single mode whose presentation (fullbleed vs. sliding) derives from
plank count.

Full spec: `agents/superpowers/specs/2026-07-19-url-mapping-deck-structure-design.md`

> **Execution policy** — of paramount importance for all execution: delegate the
> bulk of the work to cheaper models. Sonnet subagents do the file-by-file
> writing (mechanical sweeps, per-plugin `urlKey` declarations, tests, consumer
> updates); the premier model (Fable) only drives and validates (decompose,
> prompt, review, build/test, integrate).

## Locked product decisions

- Workspace base via reserved `w` pair with mid-chain rebasing — no compound
  `spaceId:entityId` ids.
- `urlKey` is optional, defaults to the plugin id; short keys for primary
  types; global uniqueness with drop+warn on duplicates.
- No per-extension resolve/path function — mapping is static both directions.
- Attention is never in the URL — ephemeral, like cursors.
- One deck mode, derived from plank count; no tiling for now.
- `navigationDefault` setting defaults to `'replace'`; shift-click inverts.
- Vertical companions dropped for now.
- No compatibility shims anywhere in the cutover.

See TASKS.md in this directory for the phased execution ledger.
