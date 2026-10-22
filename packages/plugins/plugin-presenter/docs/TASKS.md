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
- [x] **`Deck` runtime** — `slideSourcesAtom` / `usePresentationDeck` → `SlideSource[]` (`text | object | pending`;
      deleted targets omitted). The document preview stays on `DocumentArticle` → `RevealPlayer` until Phase 3.
- [x] **`PresentationArticle` + `SlideFrame`** — replaces `CollectionArticle`; `DocumentArticle` (preview
      companion) and `SlideArticle` (markdown slide surface) remain; `SlideEditorArticle` edits owned slides.
- [x] **Fullscreen toggle, toolbar + overlay pager, focus-scoped keys**.
- [x] **Slide index view state** — `presenter-slide` aspect, `local` backend.
- [x] **Delete** `PresenterContext`, `StartButton`, `Layout`, `CollectionArticle`, `presentCollections`.
- [x] **Demo presentation story** — `plugins/plugin-presenter/Demo` (plan Task 10), 10 slides, every layout.
- [x] **Verify in the running app** — 10/11 steps passed. The failure (a new Presentation was not filed into
      Collections, so it was invisible in the navtree) is fixed by tagging it `Collection.ItemTag`. Cosmetic
      findings fixed in the same wave: typename label for unnamed decks, picker labels and tooltip, owned slides
      offering both Remove and Delete, the slide editor's tiny preview.

### Phase 1 follow-ups

- [ ] Add index-clamp tests for `addSlide` / `link` / `move`, and verify `move`'s `Ref.fromURI` resolves in a live db.
- [ ] Unit-check that `schema.ts` lists `Presentation` and the create entry id equals the typename.
- [ ] Key duplicate links as `${id}:${index}` at render if duplicates become reachable.
- [ ] Reuse the real lazy `SlideArticle` in the `SlideRenderer` Object story instead of a story-local surface.
- [ ] Assert the fallback → surface transition in a gated-surface story.
- [ ] Focus the shell on mount or pager click. ~~Shift+F is not handled.~~ (`Deck` handles `F`.)
- [ ] Add-slide button as a Toolbar item (roving focus); `SlideEditorArticle` ignores `attendableId`.
- [ ] `Presentation.addSlide` / `link` / `remove` / `move`: the `Obj.update` callback parameter shadows `presentation`.
- [ ] `toSlideSources`: drop the raw-uri fallback when `EID.tryParse` fails, or test the case.
- [ ] Test a `pending` source turning into `text`/`object` once its target loads.
- [ ] `SlideRenderer` defaults `attendableId` to `object.id`; pass the deck's real attendable id.
- [ ] `TitleSlide` uses literal sizes (`text-8xl`, `size-48`); derive from the frame.
- [ ] ArrowUp/ArrowDown jump to first/last (carried from the legacy pager, never requested); reconsider.
- [ ] `Panel.Header` + `Toolbar.Root` stand in for a `Panel.Toolbar` that does not exist; adopt one if it lands.
- [ ] `Button.Root iconOnly` stands in for `IconButton` (not exported where needed); switch when available.
- [ ] Opening an owned slide warns "equally specific URL bindings address one node": plugin-space's
      `collections` and `objects` app-graph extensions share the `object` URL key and path, and both claim the
      nested node `…/collections/<presentation>/<slide>`. Not presenter's binding; fix in plugin-space (and teach
      `resolveCollectionObjectPath` about container-annotated objects so slide deep links resolve).
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
