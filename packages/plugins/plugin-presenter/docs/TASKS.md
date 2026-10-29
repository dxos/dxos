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
- [x] **Demo presentation story** — `plugins/plugin-presenter/stories/Demo` (`src/stories/Demo.stories.tsx`) (plan Task 10), 10 slides, every layout.
- [x] **Verify in the running app** — 10/11 steps passed. The failure (a new Presentation was not filed into
      Collections, so it was invisible in the navtree) is fixed by tagging it `Collection.ItemTag`. Cosmetic
      findings fixed in the same wave: typename label for unnamed decks, picker labels and tooltip, owned slides
      offering both Remove and Delete, the slide editor's tiny preview.

### Phase 1 follow-ups

- [x] Picker and navtree use the same fallback label for unnamed objects (`object-name.placeholder`).
- [ ] Slide editor preview text is small in a narrow plank: the preview is a faithful 16:9 thumbnail of the 2560-wide slide canvas, so text scales with plank width. Revisit with Phase 3 layouts (e.g. a zoom control or a larger preview mode).
- [x] Keys (`f`, arrows) handled on the whole deck panel, so they keep working after a toolbar or status-bar click.
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

- [x] **Embedded surfaces** — `<Surface ref="echo:///<id>" role="slide" />` inside a slide (any slot), with the linked-section fallback chain; story `plugins/plugin-presenter/components/SlideRenderer` → `EmbeddedSurface` (text + a live object in `two-cols`); missing, malformed and never-existed refs settle on the placeholder.
- [x] **DXOS frontmatter extension** — `backgroundVideo` (loop, muted, autoplay), `backgroundOpacity`, `backgroundPosition`; convert `testing/deck.md` and `testing/2025-05-20-effect.md` from reveal syntax.
- [x] **unified pipeline** → React for the Slidev subset; layouts, `::slot::`, `<v-click*>`, notes.
- [x] **Evaluate `@slidev/parser`** for the preview `---` split — rejected (Node-targeted, not in the repo); the splitter is owned in `src/markdown`.
- [x] **Migrate** reveal syntax in test decks; reveal.js deleted (no setting).
- [x] **Print stylesheet** — `Deck/print.css`, imported by `Deck`; scoped by `html[data-printing-deck]`, prints every slide.
- [x] **Object image embeds** — `![label](echo:///<id>)` renders the object like `<Surface ref>`, keeping main's reveal-era syntax (#14152) and plugin-debug's presenter sample working.
- [x] **Themes** — `default`, `light`, `dark`, `serif` via `--slide-*` variables; `theme:` headmatter, Presentation `theme` setting with color/font overrides; story `plugins/plugin-presenter/components/SlideTheme`.
- [x] **Slide grid** — the Presentation article shows every slide as a thumbnail (`SlideGrid`, react-ui-list `Listbox` tiles in a `Viewport`), no pager; drag a thumbnail to reorder sections, double-click to present from it (D-51).
- [ ] Theme-driven Tailwind utilities for plugin-contributed themes (a `SlideTheme` capability) if a second source of themes appears.
- [ ] `class:` frontmatter only works with Tailwind utilities that are already generated (the markdown is not scanned); consider a safelist.
- [ ] Known deck conversion losses: per-colour tints behind the ECHO/HALO/MESH/EDGE images (needs a tint layer separate from `backgroundOpacity`), fixed image heights, and the dropped hidden FADE slide.
- [ ] **Print/export operation**: an operation that prints a document or presentation to PDF (uses the print stylesheet; Save as PDF). Browser print already prints the whole deck from the focused deck. (User TODO, 2026-10-22.)
- [ ] **Print async content**: the print container mounts at `beforeprint`, so Prism grammars, embedded surfaces and images can print blank; pre-mount and await the container (e.g. in the print/export operation) before opening the print dialog.

## Phase 4: Slide surfaces

- [ ] **Sheet, canvas, tldraw, outline** `role=slide` surfaces.
- [ ] **Fallback chain** — `Slide` → `Section` → `CardContent` → title slide.
- [ ] **Surface-lookup helper** + picker filter toggle.

## Phase 5: Assistant skill

- [x] **`PresenterSkill`** on `Presentation` — `CreatePresentation`, `AddSection`, `ListLayouts`, `PresentObject`; handler tests in `src/operations/presenter-skill.test.ts` (`PresentObject` is untested: it needs the deck's capabilities).
- [ ] **Eval** with memoized fixtures.

## Phase 6: Slide editor

- [x] **Toolbar** — `EditorToolbar` formatting; layout picker (writes `layout:`); insert click step, column break, object, background, notes; view controls.
- [x] **Preview modes** — vertical split (editor above, slide below) and companion; mode and split position in view state.
- [x] **Editor → preview** — cursor inside a click group reveals up to its step; the cursor's slot is outlined.
- [x] **Preview → editor** — rendered elements carry `data-source` ranges from mdast positions; a click selects the source.
- [x] **Present from here** and previous/next slide from the editor.
- [x] Stories with play tests for typing, layout, insert, cursor step and preview click (`containers/SlideEditorArticle`).
- [ ] Stories for the companion mode, background and object insert; spec QA entries.
- [x] Layout picker on a tiled `Listbox` (react-ui `Listbox` gained `tiles`).
- [x] **DSL highlighting** — `slideTokens` (frontmatter, keys, `::slot::`, click/`Surface` tags and attributes, object embeds, notes) and the `slideHighlight` CodeMirror extension.

- [x] **Reconcile the toolbars** (user TODO, 2026-10-23): editing actions such as "start next column" and "insert object" belong in the formatting toolbar, not the slide toolbar; keep only slide-level controls (layout, background, notes, view) separate. Done: reveal, column break and insert object extend `Editor.Toolbar`'s insert group (`useSlideInsertActions`).
- [x] **Extending another component's toolbar** (user TODO, 2026-10-23): design a generic way for a consumer to add items to a toolbar it does not own (here, slide actions in `react-ui-editor`'s `EditorToolbar`). Starting points: `EditorToolbar`'s `customActions` atom (menu actions only, no custom React items such as pickers) and app-graph toolbar actions (`graphActions` with `isToolbarAction`, as MarkdownArticle uses). Draft design and prototype: `react-ui-menu/docs/TOOLBAR.md`, `ui/react-ui-menu/ActionToolbar` stories (zones, rows, named groups, overflow menu).
- [x] **SlideToolbar on the toolbar builder** (user TODO, 2026-10-23): `SlideToolbar` hand-assembles `Toolbar.Root` children instead of using `MenuBuilder` + `ActionToolbar`; migrate it as part of the toolbar-mechanism review (`react-ui-menu/docs/TOOLBAR.md`).

## Phase 7: Later

- [ ] **Presenter view** — notes, next slide, timer.
