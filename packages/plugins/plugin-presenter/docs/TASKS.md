# plugin-presenter — Tasks

Design: [DESIGN.md](./DESIGN.md).

## Phase 0: Design

- [x] **Reorganize `src/components`** — one folder and story per component.
- [x] **Agree the design** — Q1–Q7 decided (DESIGN.md decisions log).
- [x] **Settle the slide DSL** — strict Slidev-compatible subset (Q8).
- [x] **Approve DESIGN.md** — approved 2026-10-22.
- [ ] **Review [PLAN-PHASE-1.md](./PLAN-PHASE-1.md)** and pick an execution mode.
- [ ] **Register the project** — blocked: Composer MCP server needs `/mcp` authorization.

## Phase 1: Presentation type + runtime

- [ ] **`Presentation` schema** — `org.dxos.type.presentation@0.1.0`, `sections: Ref[]`; create action.
- [ ] **App graph** — folder node, one child per section, drag-reorder writes `sections`.
- [ ] **"Add to presentation"** picker — link object or add owned `Text`.
- [ ] **`Deck` runtime** — `usePresentationDeck`, `useDocumentDeck` (preview) → `SlideSource[]`.
- [ ] **`PresentationArticle` + `SlideFrame`** — replaces Document/Collection/SlideArticle.
- [ ] **Fullscreen toggle, toolbar + overlay pager, focus-scoped keys**.
- [ ] **Slide index view state** — `presenter-slide` aspect, `local` backend.
- [ ] **Delete** `PresenterContext`, `StartButton`, `Layout`, `CollectionArticle`, `presentCollections`.
- [ ] **Demo presentation story** — `plugins/plugin-presenter/Demo` (plan Task 10).

## Phase 2: Pager primitive

- [ ] **`@dxos/react-ui` `Pager`** composite; presenter adopts it.
- [ ] **Reconcile** — `Carousel` triggers adopt pager styles; autocue `TakeStory` uses `Pager`.

## Phase 3: Markdown renderer

- [ ] **unified pipeline** → React for the Slidev subset; layouts, `::slot::`, `<v-click*>`, notes.
- [ ] **Evaluate `@slidev/parser`** for the preview `---` split (browser-safe?).
- [ ] **Migrate** reveal syntax in test decks; reveal behind a setting until parity, then delete.
- [ ] **Print stylesheet**.

## Phase 4: Slide surfaces

- [ ] **Sheet, canvas, tldraw, outline** `role=slide` surfaces.
- [ ] **Fallback chain** — `Slide` → `Section` → `CardContent` → title slide.
- [ ] **Surface-lookup helper** + picker filter toggle.

## Phase 5: Assistant skill

- [ ] **`PresenterSkill`** on `Presentation` — `CreatePresentation`, `AddSection`, `ListLayouts`, `PresentObject`.
- [ ] **Eval** with memoized fixtures.

## Phase 6: Later

- [ ] **Presenter view** — notes, next slide, timer.
