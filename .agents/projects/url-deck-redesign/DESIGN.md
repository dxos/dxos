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

## Phase C decisions (post-e2e)

- **A key may be shared by multiple extensions.** The original "drop duplicates" rule broke the
  root-collection vs nested-collection split (both need `collection`). The key table now groups
  sharers; forward resolution matches a node from any of them. Reverse mapping was already per-node.
- **Static path templates, search as fallback.** Reverse mapping is trivial (a node id _is_ its
  path); forward mapping's intermediate segments are missing from the short URL. Fixed-shape
  extensions declare a `urlPath` template for deterministic `expandPath`; recursive shapes (nested
  collections — variable ancestor ids not in the URL) fall back to the guided BFS. This finishes the
  A1 "static path derivation from extension metadata" intent as declarative data, not resolver code.
- **Loading is behind a capability, not a client dependency.** Layout plugins must not depend on the
  client for loading. `AppCapabilities.NavigationTargetLoader` (contributed by plugin-client) loads a
  target by `(spaceId, entityId)`; `plugin-deck` dropped its `@dxos/plugin-client` dep. (Loader ≈ the
  existing `NavigationTargetResolver`, which also loads by URI — but the resolver constructs a
  per-plugin path and needs `Database.Service` provided by the caller; the loader is path-free and
  self-contained, preserving graph-derived paths.)
- **Cold restore needs a bounded resolve retry.** Loading the target object does not load its
  container chain; `expandPath` triggers those loads but cannot await them. The url-handler retries
  resolution for loader-confirmed planks until ancestors materialize. Deferred optimization (per
  user): persist the learned key→ancestor-template cache to localStorage so warm devices skip the
  search entirely; true cold-start on a new device still needs the loader + retry.
