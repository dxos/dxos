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
  children of an object node, id `<plankId>/~<variant>`, rendered *in the deck*
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
  variant, label, icon, data,
  scope: 'node' | 'workspace' | 'global',
  position, // ordering within the scope group
})
```

`makeDeckCompanion` is deleted; callers migrate to `scope: 'workspace' | 'global'`.

**Scope taxonomy** (decided: *node*, not *object* — graph nodes need not be
ECHO objects):

| Scope       | Graph attachment                  | Resolved against                  |
| ----------- | --------------------------------- | --------------------------------- |
| `node`      | child of the node it accompanies  | the attended plank's node         |
| `workspace` | child of root, tagged `workspace` | the current space                 |
| `global`    | child of root, tagged `global`    | nothing — always applicable       |

**One home.** The complementary sidebar rail lists *all applicable* companions,
grouped most-specific-first: node → workspace → global, `Position.compare`
within each group, thin separators between groups. Tabs model is kept: one
panel expanded at a time.

**Rendering contracts are unchanged for the experiment**: node-scoped
companions render through `AppSurface.Article` with `companionTo` (as today);
workspace/global-scoped through `AppSurface.deckCompanion(variant)`. Contract
unification is a possible follow-up, not part of the experiment.

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
- Selection: node-scoped selections are stored by *variant* so they rebind to
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

## 5. Out of scope

- `plugin-simple-layout` (mobile) keeps its own companion path during the
  experiment; reconcile only if the experiment lands.
- Surface-contract unification (Article vs deckCompanion roles).
- Pinning a companion to a specific plank independent of attention (possible
  later feature).

## 6. Key reference points

- `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:307-355` — the two builders.
- `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx` — target UI.
- `packages/plugins/plugin-deck/src/hooks/{useCompanions,useDeckCompanions,useSelectedCompanion}.ts` — resolution.
- `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx` — in-deck machinery to remove (`CompanionSplit` :352, sizing :97-103, reveal :1424).
- `packages/plugins/plugin-deck/src/capabilities/url-handler.ts:176-207,315-347` — URL companion pairs.
- `packages/ui/ui-theme/src/css/theme/spacing.css:138-146` + `css/layout/main.css` — sidebar width vars.
- `packages/ui/react-ui/src/components/Main/Main.tsx:362` — `MainComplementarySidebar`.
