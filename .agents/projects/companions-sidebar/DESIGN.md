# Companions in the Sidebar — Design

Experimental refactor: merge plank companions and deck companions into a single
companion concept, rendered in the complementary (right) sidebar instead of the
main content area. The experiment lives on its branch — there is no settings
toggle; the branch itself is the switch, and landing it is the accept/reject
decision.

## 1. Problem

Composer has two companion mechanisms that differ in graph attachment, surface
contract, and chrome, but serve one purpose (auxiliary panels beside the user's
work):

- **Plank companions** (`AppNode.makeCompanion`, `PLANK_COMPANION_TYPE`):
  children of an object node, id `<plankId>/~<variant>`, rendered _in the deck_
  as a splitter-paired plank (`CompanionSplit`/`CompanionPlank`). Open state in
  `DeckState.companionPlanks` (per plank), width in `plankSizing['companion']`,
  serialized into the URL plank chain. ~28 contributions across ~20 plugins.
- **Deck companions** (`AppNode.makeDeckCompanion`, `DECK_COMPANION_TYPE`):
  children of the graph root, rendered in `ComplementarySidebar` as a vertical
  icon-tab rail (R0) + one expanded panel (R1), sorted by `Position`. 10
  contributions.

The in-deck rendering has been a sustained source of geometry defects (scroll
snap on open, phantom widths, attention-coupled resize — see
`packages/plugins/plugin-deck/DESIGN.md` §4 and the 2026-08-02 handoff), and the
dual concept forces every plugin author to choose a mechanism.

## 2. Shape

**One concept.** Single `COMPANION_TYPE`; single builder:

```ts
AppNode.makeCompanion({
  variant,
  label,
  icon,
  data,
  scope: 'node' | 'workspace' | 'global',
  position, // ordering within the scope group
});
```

`makeDeckCompanion` is deleted; callers migrate to `scope: 'workspace' | 'global'`.

**Scope taxonomy** (decided: _node_, not _object_ — graph nodes need not be
ECHO objects):

| Scope       | Graph attachment                  | Resolved against            |
| ----------- | --------------------------------- | --------------------------- |
| `node`      | child of the node it accompanies  | the attended plank's node   |
| `workspace` | child of root, tagged `workspace` | the current space           |
| `global`    | child of root, tagged `global`    | nothing — always applicable |

**One home.** The complementary sidebar rail lists _all applicable_ companions,
grouped most-specific-first: node → workspace → global, `Position.compare`
within each group, thin separators between groups. Tabs model is kept: one
panel expanded at a time.

**Rendering contracts are unchanged for the experiment**: node-scoped
companions render through `AppSurface.Article` with `companionTo` (as today);
workspace/global-scoped through `AppSurface.deckCompanion(variant)`. Contract
unification is a possible follow-up, not part of the experiment.

**Attention linkage (ratified 2026-08-03).** A node-scoped panel's heading is
attention-aware: sigil/title take the accent (via `useAttention` +
`Pane.Title`-style treatment bound to the anchor) whenever the anchor node is
attended, signalling "this panel is about the thing you're attending".
Workspace/global panel headings keep the neutral treatment — they relate to
nothing in particular. Today's plain `IconButton` heading is replaced by the
attention-aware sigil.

**Resizable sidebar.** The complementary sidebar gains a drag handle on the R1
inner edge that overrides `--dx-complementary-sidebar-size`; width persists in
`StoredDeckState` (new `complementarySidebarSize`), mirroring the plank-seam
sizing pattern.

## 3. State model

Replaced/removed:

- `DeckState.companionPlanks` — gone (no per-plank open state).
- `plankSizing['companion']`, `CompanionSplit`, `CompanionPlank`,
  `DeckOperation.Adjust {type:'companion'}`, `util/companion-anchor.ts`, the
  companion reveal-scroll effect — gone.
- URL: per-plank `companion/<variant>` pairs in the plank chain → a single
  `companion=<variant>` value.

Kept/added:

- `complementarySidebarState: 'closed' | 'collapsed' | 'expanded'` (exists).
- Selection: node-scoped selections are stored by _variant_ so they rebind to
  the attended plank as attention moves; workspace/global selections by id (as
  today via `complementarySidebarPanel`).
- `complementarySidebarSize` (new, persisted width).

**Attention behavior** (decided): the node group re-resolves from the attended
plank. If the selected variant is absent on the newly attended node, fall back
to the first available companion in the node group (matches today's
`useSelectedCompanion` fallback).

The plank toolbar companion button (`plankHeading.companion`) becomes "open in
sidebar" (expands the sidebar with that node's first/selected companion) or is
removed — decide during implementation by feel.

## 4. Explicit trade-offs (ratified)

- **One companion panel globally**, vs. today's per-plank companions where two
  planks can each show their own side-by-side. This deliberately supersedes the
  per-plank model that landed in PR #12424 (burdon's `deck` project) — the
  experiment accepts the regression to evaluate the simpler model. Coordinate
  before landing.
- Companion width no longer participates in deck geometry — the entire class of
  companion-driven scroll/width defects dissolves.

## 5. Pop-out (ratified 2026-08-03)

Popping a companion out of the sidebar **clones** it into the deck as a
first-class plank — the sidebar is untouched (rail keeps its tab, panel keeps
following attention). The clone is **pinned** to the node that was attended at
pop time, so multiple clones with different sources can sit side by side
(several assistants for several messages; comment threads for two documents).

- **Identity is the binding.** The clone's plank id is the companion node id
  `<sourceNodeId>/~<variant>`, placed into `deck.active` via ordinary
  `LayoutOperation.Open` pivoted on the attended plank. No new state: dedup,
  close, width (`plankSizing`) and per-deck persistence are the ordinary plank
  paths. Closing the source plank does not close the clone; a deleted source
  sends the clone to the ordinary not-found fallback.
- **v1 pops node-scoped companions only** — the pop affordance appears on node
  group panels. Workspace/global panels are always available in the sidebar and
  have no source to pin, so popping them is deferred until motivated.
- **Heading reuses the flatten-mode breadcrumbs** (`Plank` already accepts
  `breadcrumbs` + `onSelectBreadcrumb`): the clone's heading reads
  `<Source> › <Companion>` — the companion's own icon stays the sigil (it
  identifies the panel type), the crumb carries the source. Clicking the crumb
  jumps to the source plank (`ScrollIntoView`) or reopens it (`Open`, pivoted
  before the clone) if it was closed. In flatten mode the source crumb merges
  into the existing navigation trail.
- **Flatten gating**: popping is not offered while `flatten` is on. If flatten
  turns on with clones open, nothing special happens — a clone is an ordinary
  active entry, so it collapses into the breadcrumb chain like any plank; only
  the affordance is gated.
- **Sidebar while attending a clone**: the node group is simply empty (a
  companion has no companions), i.e. exactly what any node without companions
  shows; the existing selection fallback picks the first workspace/global
  panel. Zero special-casing.
- **Attention linkage**: a clone's heading shows the `related` accent when its
  _source_ node is attended (and ordinary attention when the clone itself is).
  The attention tracker already computes companion→parent relatedness for
  linked segments; the source→clone direction may need a small tracker or
  consumer-side extension — attending `<src>` should light `<src>/~<variant>`.
- **URL**: clone planks take over the `companion` chain key with a
  self-contained id that encodes source + variant, so a clone survives its
  source being closed and pairs keep meaning "contents of the deck, in order".
  The sidebar selection moves to a trailing **`context`** pair (its own key;
  it is a view preference, not deck content).
- `activeCall` pops like anything else if/when root popping arrives — it is
  already a secondary surface over a running call, so a clone is just another
  view (a `poppable` opt-out was considered and dropped as unmotivated).

## 6. Out of scope

- `plugin-simple-layout` (mobile) keeps its own companion path during the
  experiment; reconcile only if the experiment lands.
- Surface-contract unification (Article vs deckCompanion roles).
- Popping workspace/global companions (see §5).

## 6. Key reference points

- `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:307-355` — the two builders.
- `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx` — target UI.
- `packages/plugins/plugin-deck/src/hooks/{useCompanions,useDeckCompanions,useSelectedCompanion}.ts` — resolution.
- `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx` — in-deck machinery to remove (`CompanionSplit` :352, sizing :97-103, reveal :1424).
- `packages/plugins/plugin-deck/src/capabilities/url-handler.ts:176-207,315-347` — URL companion pairs.
- `packages/ui/ui-theme/src/css/theme/spacing.css:138-146` + `css/layout/main.css` — sidebar width vars.
- `packages/ui/react-ui/src/components/Main/Main.tsx:362` — `MainComplementarySidebar`.
