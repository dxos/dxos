# plugin-presenter — Tasks

Design: [DESIGN.md](./DESIGN.md).

## Phase 0: Design

- [x] **Reorganize `src/components`** — one folder and story per component.
- [ ] **Agree the design** — resolve DESIGN.md open questions 1–7.
- [ ] **Register the project** — blocked: Composer MCP server needs `/mcp` authorization.

## Phase 1: Runtime unification

- [ ] **`Deck` model** — `useDocumentDeck`, `useCollectionDeck` → `SlideSource[]`.
- [ ] **`PresentationArticle`** — replaces `DocumentArticle` + `CollectionArticle`.
- [ ] **`SlideFrame`** — 16:9 scaled frame (from `Panel`); wraps every slide.
- [ ] **Fullscreen toggle + pager toolbar** — in-article; overlay pager in fullscreen.
- [ ] **Focus-scoped keys** — drop `window` listener; delete `PresenterContext`, `StartButton`, `Layout`.

## Phase 2: Pager primitive

- [ ] **`@dxos/react-ui` `Pager`** composite; presenter adopts it.
- [ ] **Reconcile** with `Carousel` and autocue (check autocue-ui branch, #14028).

## Phase 3: Markdown renderer

- [ ] **unified pipeline** → React; layouts, fragments, notes.
- [ ] **Migrate** reveal syntax in test decks; reveal behind a setting until parity.
- [ ] **Print stylesheet**.

## Phase 4: Slide surfaces

- [ ] **Sheet, canvas, tldraw** `role=slide` surfaces; `Card` fallback.
- [ ] **Collections out of experimental** — remove `presentCollections`.

## Phase 5: Assistant skill

- [ ] **`PresenterSkill`** — `CreatePresentation`, `ListLayouts`, `PresentObject`.
- [ ] **Eval** with memoized fixtures.
