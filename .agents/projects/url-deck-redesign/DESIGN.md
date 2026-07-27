# URL & Deck Redesign — Design

Composer's URL structure and deck-layout state model are being redesigned
together: URLs move to Macro-style chained `(prefix, id)` pairs anchored by a
`/w/<workspaceId>` workspace base with mid-chain rebasing, the
`NavigationPathResolver` capability dissolves into the graph builder via
per-extension `url` bindings, and the deck collapses from three explicit modes to
a single stored mode whose presentation (fullbleed / tiling / sliding) derives
from plank count.

Full spec: `agents/superpowers/specs/2026-07-19-url-mapping-deck-structure-design.md`

> **Execution policy** — of paramount importance for all execution: delegate the
> bulk of the work to cheaper models. Sonnet subagents do the file-by-file
> writing (mechanical sweeps, per-plugin `url` bindings, tests, consumer
> updates); the premier model (Fable) only drives and validates (decompose,
> prompt, review, build/test, integrate).

## Locked product decisions

- Workspace base via reserved `w` pair with mid-chain rebasing — no compound
  `spaceId:entityId` ids.
- Each extension declares `url: { key, kind, path }`; short keys for primary
  types, and a key may be shared by several extensions (see Phase C).
- Mapping is declarative both directions: `path` is a static template, or a
  resolver function for recursive shapes (see Phase C).
- Attention is never in the URL — ephemeral, like cursors.
- One stored deck mode; presentation derives from plank count (tiling landed
  later — see "As built" below).
- Navigation is gesture-based, not a setting: `disposition: solo | add | auto`,
  with shift forcing an add.
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

## As built (deltas from the locked decisions above)

- **Tiling landed.** Exactly two planks tile (`TILING_MIN`/`TILING_MAX` are both 2), rendered with
  `Splitter.Root` — the same primitive the companion used before it became a plank. `tilingSizing` is
  the start pane's width in rem; the end pane fills the remainder. Three or more planks slide.
- **`LayoutMode` was kept**, as derived state rather than stored: `solo | multi | solo--fullscreen`
  from `getMode(deck, fullscreen)`, and `AppCapabilities.Layout.mode` stays a `string`. Only
  `LayoutOperation.SetLayoutMode` was removed.
- **The companion is a plank**, so a solo plank plus its companion _is_ the tiling presentation. Its
  width is `tilingSizing`; only the selected variant remains in view state.
- **No graph-builder `resolver` is declared anywhere.** The mechanism (and `Graph.initialize`) survives
  in app-graph, TODO-marked, but every URL target is reached through a declared `url` binding.
- **Naming:** `Paths` → `GraphPath` (graph paths, not URL paths), URL↔node bridging extracted as
  `UrlResolution`, and app-graph's `companion` vocabulary is `linked`.
