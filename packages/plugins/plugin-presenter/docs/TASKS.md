# plugin-presenter — Tasks

Design: [DESIGN.md](./DESIGN.md).

## Phase 0: Design

- [x] **Reorganize `src/components`** — one folder and story per component.
- [x] **Agree the design** — Q1–Q7 decided (DESIGN.md decisions log).
- [x] **Settle the slide DSL** — strict Slidev-compatible subset (Q8).
- [x] **Approve DESIGN.md** — approved 2026-10-22.
- [x] **Review [PLAN-PHASE-1.md](./PLAN-PHASE-1.md)** and pick an execution mode.
- [ ] **Register the project** — blocked: Composer MCP server needs `/mcp` authorization.

## Phase 1: Presentation type + runtime

- [x] **`Presentation` schema** — `org.dxos.type.presentation@0.1.0`, `sections: Ref[]`; create action.
- [x] **App graph** — folder node, one child per section, drag-reorder writes `sections`.
- [x] **"Add to presentation"** picker — link object or add owned `Text`.
- [x] **`Deck` runtime** — `usePresentationDeck`, `useDocumentDeck` (preview) → `SlideSource[]`.
- [x] **`PresentationArticle` + `SlideFrame`** — replaces Document/Collection/SlideArticle.
- [x] **Fullscreen toggle, toolbar + overlay pager, focus-scoped keys**.
- [x] **Slide index view state** — `presenter-slide` aspect, `local` backend.
- [x] **Delete** `PresenterContext`, `StartButton`, `Layout`, `CollectionArticle`, `presentCollections`.
- [ ] **Demo presentation story** — `plugins/plugin-presenter/Demo` (plan Task 10).
- [ ] **Verify in the running app** — create a Presentation, add a slide, link a markdown doc, reorder in the navtree,
      press `f`, step with arrows, ESC, reload (same slide); generic delete of an owned slide leaves no dead ref
      in `sections`; Presentation fullscreen on its own plank.

### Phase 1 follow-ups

- [ ] Add index-clamp tests for `addSlide` / `link` / `move`, and verify `move`'s `Ref.fromURI` resolves in a live db.
- [ ] Unit-check that `schema.ts` lists `Presentation` and the create entry id equals the typename.
- [ ] Key duplicate links as `${id}:${index}` at render if duplicates become reachable.
- [ ] Reuse the real lazy `SlideArticle` in the `SlideRenderer` Object story instead of a story-local surface.
- [ ] Assert the fallback → surface transition in a gated-surface story.
- [ ] Focus the shell on mount or pager click; Shift+F is not handled.
- [ ] Add-slide button as a Toolbar item (roving focus); `SlideEditorArticle` ignores `attendableId`.
- [ ] `SectionPicker` fallback label is the raw object id.
- [ ] Navtree connector rebuilds children on every owned-slide keystroke; derive a heading-only atom.
- [ ] Tighten the "no settings module" test (checks a substring).

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
