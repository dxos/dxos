# Presenter Phase 1 — Presentation type + runtime: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users create a `Presentation` (ordered sections: owned markdown `Text` slides or links to other objects),
see it in the navtree as a folder of slides, and present it in place or fullscreen with a pager.

**Architecture:** A new ECHO type in `src/types/Presentation.ts` with pure helpers; a `SlideSource` model derived
from its sections; one `Deck` component (frame, toolbar, overlay pager, focus-scoped keys) rendered by
`PresentationArticle`; per-user slide index in `react-ui-attention` view state; app-graph children with
drag-reorder via `ContainerModel`. Collection decks are removed.

**Tech Stack:** TypeScript, Effect, ECHO (`@dxos/echo`, `@dxos/schema`), app-framework/app-toolkit, React, Tailwind,
`@dxos/react-ui*`, vitest (node + storybook), moon.

**Spec:** [DESIGN.md](./DESIGN.md) §1–§4 and Phases → 1.

## Global Constraints

- Typename `org.dxos.type.presentation`, version `0.1.0`; field `sections: Schema.Array(Ref.Ref(Obj.Unknown))`.
- One section is exactly one slide; `---` inside a section is not a slide break.
- View-state aspect key `presenter-slide`, backend `local`.
- Keys bind on the deck's focus scope, never `window`: ←/→ step, Shift+←/→ and Home/End first/last, `f` toggles
  fullscreen, ESC exits fullscreen.
- No new layout mode: fullscreen goes through `PresenterOperation.SetPresenting` → `DeckOperation.Adjust`.
- In-repo deps `workspace:*` (`pnpm add --filter "@dxos/plugin-presenter" …`); no casts (`as any`, `!`); relative
  imports carry `.ts`/`.tsx`; arrow-function components; `IconButton`-style primitives, not hand-rolled buttons.
- Every story creates ECHO objects inside `render` (`useMemo`) or `onCreateSpace`, never in module-level `args`.
- `pnpm format` before every commit; `PLUGIN.mdl` changes add a `## Changelog` entry (`mdl` skill).
- Run `moon run plugin-presenter:gen-modules` after editing `src/capabilities/index.ts`.

## Plan decisions (agent calls — review)

1. **Preview companion keeps `RevealPlayer` in Phase 1**; it moves onto the `Deck` runtime with the new renderer in
   Phase 3. Rendering markdown slides one at a time needs a non-reveal renderer, and the interim one (`Slide`,
   ReactMarkdown) would regress existing reveal decks. DESIGN.md Phases is updated to match.
2. **Owned vs linked:** a section is owned iff `Obj.instanceOf(Text.Text, target) && Obj.getParent(target) ===
presentation`. The `Text` check guards against `SetParent({ override: false })` claiming a parentless linked
   object, which would otherwise be deleted on remove.
3. **Owned slides open a `SlideEditorArticle`** (markdown editor bound to the `Text` + live `SlideFrame` preview);
   linked slides navigate to the object itself. Clicking the presentation node opens the deck.
4. **Markdown in Phase 1** renders with the existing `Slide` component inside `SlideFrame` (replaced in Phase 3).
5. **`Settings` module and `./Settings` export are deleted** with `presentCollections`; changeset `minor`.

## Review Focus

1. **Empty presentation** (0 sections) — deck shows an empty state with an "Add slide" button; pager shows `0 / 0`
   and is disabled; no crash on index clamp. Test in Task 4 and story in Task 6.
2. **Stored index beyond count** (slides deleted since last view) — index clamps to `count - 1`. Test in Task 3.
3. **Unresolved ref** (linked object not loaded or deleted) — renders a `pending` placeholder slide, not a crash, and
   is skipped by nothing (count stays stable). Test in Task 4.
4. **Linking an object that has no parent** — it stays linked, not owned; removing the section leaves the object.
   Test in Task 1.
5. **Keys while focus is inside an editable slide surface** — arrow keys typed into an input/contenteditable must
   not change slides. Story play test in Task 6.

---

### Task 1: `Presentation` schema and helpers

**Files:**

- Create: `src/types/Presentation.ts`, `src/types/Presentation.test.ts`
- Modify: `src/types/index.ts` (add `export * as Presentation from './Presentation.ts';`), `package.json`
  (`exports["./Presentation"]`; the `typesVersions` entry already exists), `vite.config.ts` (entry
  `Presentation: 'src/types/Presentation.ts'`)

**Interfaces:**

- Produces (namespace `Presentation`):
  - `class Presentation extends Type.makeObject<Presentation>(DXN.make('org.dxos.type.presentation', '0.1.0'))`
    with `name?: string`, `sections: Ref<Obj.Unknown>[]` (`FormInputAnnotation.set(false)`; no `SetParent` annotation — owned
    slides are parented explicitly, see decision 2), `LabelAnnotation(['name'])`, `IconAnnotation({ icon:
'ph--presentation--regular', hue: 'orange' })`, `Annotation.UserType.set({})`.
  - `make(props?: { name?: string; slides?: string[] }): Presentation` — one owned `Text` per slide string.
  - `isOwned(presentation: Presentation, target: Obj.Unknown): boolean` — decision 2.
  - `addSlide(presentation, content: string, index?: number): Text.Text`
  - `link(presentation, object: Obj.Unknown, index?: number): void` — no-op if already a section.
  - `remove(presentation, target: Obj.Unknown): void` — splices the ref; deletes the target from its db if owned.
  - `move(presentation, from: number, to: number): void`
- All mutations wrap `Obj.change`; `index` defaults to append and clamps to `[0, length]`.

- [ ] **Step 1: Write failing tests** (`EchoTestBuilder` from `@dxos/echo-client/testing`; add it as a devDep)

```ts
test('make creates one owned Text per slide', …) // sections.length === 2; every target isOwned; contents match
test('link does not take ownership of an object with a parent', …) // doc parented to a Collection; isOwned false
test('link does not take ownership of a parentless non-Text object', …) // Markdown.Document with no parent; isOwned false
test('remove deletes owned Text but keeps linked objects', …) // db.query(Filter.id(text.id)) empty; doc still present
test('addSlide at index inserts in order', …) // ['a','c'] + addSlide('b', 1) → contents ['a','b','c']
test('move reorders sections', …)
```

- [ ] **Step 2:** `moon run plugin-presenter:test -- src/types/Presentation.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `src/types/Presentation.ts` per Interfaces; wire exports.
- [ ] **Step 4:** Re-run → PASS. `npx tsc --noEmit -p packages/plugins/plugin-presenter/tsconfig.json` → clean.
- [ ] **Step 5:** Commit `plugin-presenter: Presentation type and section helpers`.

### Task 2: Register the type and "create presentation"

**Files:**

- Create: `src/capabilities/schema.ts` (`export default [Presentation.Presentation, Text.Text];`),
  `src/capabilities/create-object.ts`
- Modify: `src/capabilities/index.ts` (`Schema = AppCapability.schema(…)`, `CreateObject =
SpaceCapability.createObject(…, { environments: ['browser', 'node', 'tauri'] })`), `src/plugin.tsx`
  (`Plugin.addModule` both), `src/plugin.test.ts`, `src/types/PresenterOperation.ts` (add `Presentation` to the
  `SetPresenting.input.object` union), `package.json` (dep `@dxos/plugin-space`)

**Interfaces:**

- Consumes: `Presentation.make` (Task 1).
- Produces: `CreateObjectEntry { id: Type.getTypename(Presentation.Presentation), createObject }` that invokes
  `SpaceOperation.AddObject { object: Presentation.make(props), target: options.target }` — same shape as
  plugin-markdown `create-object.ts`.

- [ ] **Step 1:** Extend `plugin.test.ts`: assert active modules include `${meta.profile.key}.module.Schema`; assert
      `CreateObject` is registered (activate `SpaceEvents.CreateObjectRequested` in the harness, then read
      `SpaceCapabilities.CreateObjectEntry` contributions and find the presentation typename).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; `moon run plugin-presenter:gen-modules`.
- [ ] **Step 4:** Run → PASS; typecheck clean; `moon run plugin-presenter:check-module-structure` → PASS.
- [ ] **Step 5:** Commit `plugin-presenter: register Presentation and its create entry`.

### Task 3: Slide index view state

**Files:**

- Create: `src/types/SlideViewState.ts`, `src/types/SlideViewState.test.ts`, `src/hooks/useSlideIndex.ts`,
  `src/hooks/index.ts`
- Modify: `src/types/index.ts`, `package.json`/`vite.config.ts` (subpath `./SlideViewState`)

**Interfaces:**

- Produces:
  - `SlideViewState.State = { index: number }` (mutable keys); `SlideViewState.aspect: ViewState.Aspect<State>`
    with `key: 'presenter-slide'`, `backend: 'local'`, `defaultValue: () => ({ index: 0 })`. Model:
    plugin-deck `CompanionViewState.ts`.
  - `SlideViewState.clamp(index: number, count: number): number` → `count === 0 ? 0 : min(max(index, 0), count - 1)`.
  - `useSlideIndex(contextId: string | undefined, count: number): [index: number, setIndex: (index: number) => void]`
    — `useViewState` + `useViewStateActions`; returns the clamped index; `setIndex` clamps before writing.

- [ ] **Step 1:** Tests with `new ViewState.Manager({ registry, backends: createDefaultBackends(registry) })`:
      `aspect.key === 'presenter-slide'`, `backend === 'local'`, default `{ index: 0 }`, round-trips `{ index: 3 }`
      per context id and keeps contexts separate; `clamp(7, 3) === 2`, `clamp(-1, 3) === 0`, `clamp(5, 0) === 0`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; typecheck.
- [ ] **Step 5:** Commit `plugin-presenter: per-user slide index view state`.

### Task 4: `SlideSource` model and `usePresentationDeck`

**Files:**

- Create: `src/deck/SlideSource.ts`, `src/deck/SlideSource.test.ts`, `src/deck/usePresentationDeck.ts`,
  `src/deck/index.ts`; add `#deck` to `package.json` `imports`.

**Interfaces:**

- Consumes: `Presentation.isOwned` (Task 1).
- Produces:
  - `type SlideSource = { kind: 'text'; id: string; text: Text.Text } | { kind: 'object'; id: string; object:
Obj.Unknown } | { kind: 'pending'; id: string }` — `id` is the ref's target id (stable React key).
  - `toSlideSources(presentation: Presentation.Presentation, targets: ReadonlyArray<Obj.Unknown | undefined>):
SlideSource[]` — pure; `targets[i]` is `sections[i].target`; owned → `text`, resolved linked → `object`,
    a deleted target is omitted, a not-yet-loaded one (`undefined`) → `pending`. Length equals `sections.length`
    minus deleted targets.
  - `usePresentationDeck(presentation: Presentation.Presentation): SlideSource[]` — reactive: an `Atom.make((get)
=> get(Obj.atomReactive(get(Obj.atomProperty(presentation, 'sections')))))` read with `useAtomValue`, mapped
    through `toSlideSources` in a `useMemo`.

- [ ] **Step 1:** Tests for `toSlideSources`: owned Text → `text`; linked doc → `object`; not-yet-loaded → `pending` and
      length preserved; deleted target omitted; empty presentation → `[]`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS; typecheck.
- [ ] **Step 5:** Commit `plugin-presenter: slide sources from presentation sections`.

### Task 5: `SlideFrame` and slide renderers

**Files:**

- Move: `src/components/Panel/` → `src/components/SlideFrame/` (`Panel` → `SlideFrame`, `PanelProps` →
  `SlideFrameProps`; story title `…/components/SlideFrame`); update `SlideArticle` and `Layout.stories.tsx` usages.
- Create: `src/components/SlideRenderer/SlideRenderer.tsx`, `SlideRenderer.stories.tsx`, `index.ts`

**Interfaces:**

- Consumes: `SlideSource` (Task 4).
- Produces: `SlideRenderer({ source: SlideSource; attendableId?: string })`:
  - `text` → `SlideFrame` › `Slide content={useObject(text, 'content')}`.
  - `object` → `SlideFrame` › `Surface.Surface type={AppSurface.Slide} data={{ subject: object, attendableId }}`
    with a `fallback` title slide (object icon + `Obj.getLabel`). The full Slide → Section → CardContent chain is
    Phase 4.
  - `pending` → `SlideFrame` › centred spinner/`Icon` + "Loading…" (translation key `slide-pending.label`).

- [ ] **Step 1:** Stories: `Text` (owned slide), `Object` (Markdown.Document via the presenter's own slide
      surface, `withPluginManager`), `Pending`. Each `play` asserts visible text with `expect(canvas.getByText(…))`.
- [ ] **Step 2:** `moon run plugin-presenter:test-storybook` → new stories FAIL (no component).
- [ ] **Step 3:** Implement; rename `Panel`.
- [ ] **Step 4:** Storybook tests PASS; typecheck; lint.
- [ ] **Step 5:** Commit `plugin-presenter: SlideFrame and SlideRenderer`.

### Task 6: `Deck` component — toolbar, overlay pager, focus-scoped keys

**Files:**

- Create: `src/components/Deck/Deck.tsx`, `Deck.stories.tsx`, `index.ts`
- Modify: `src/components/Pager/Pager.tsx` (remove the `window` keydown effect and the `keys`/`onExit` props;
  fully controlled `{ index, count, onChange }`; delete `StartButton`), `Pager.stories.tsx`,
  `src/components/PresentationShell/PresentationShell.tsx` (accept `onKeyDown` passthrough; unchanged ESC logic)
- Delete: `src/components/Layout/`, `src/components/PresenterContext.ts`; update `src/components/index.ts`.

**Interfaces:**

- Consumes: `SlideSource`, `SlideRenderer` (Tasks 4–5), `Pager`, `PageNumber`, `PresentationShell`.
- Produces: `DeckProps = { slides: SlideSource[]; index: number; onIndexChange: (index: number) => void;
fullscreen?: boolean; onFullscreenChange?: (fullscreen: boolean) => void; onAddSlide?: () => void;
toolbar?: ReactNode; attendableId?: string }`; `Deck` (composable, `forwardedRef`).
  - Not fullscreen: `Panel.Root` › `Panel.Toolbar` [`Pager` · `PageNumber` · `toolbar` slot · fullscreen
    `IconButton` (`ph--arrows-out--regular`, `testId presenter.fullscreen`)] › `Panel.Body` › shell › renderer.
  - Fullscreen: no toolbar; bottom overlay with `Pager` + `PageNumber`, hidden after 2000 ms without pointer
    movement, shown on `pointermove`.
  - Keys handled in the shell's `onKeyDown`, ignored when `event.target` is an `input`, `textarea` or
    `[contenteditable]` (Review Focus 5).
  - `slides.length === 0` → empty state with "Add slide" button calling `onAddSlide` (Review Focus 1).

- [ ] **Step 1:** Stories with `play` tests: `Default` (5 text slides): focus deck, `ArrowRight` ×2 → `3 / 5`;
      `Shift+ArrowLeft` → `1 / 5`; `End` → `5 / 5`. `Empty`: shows "Add slide", `PageNumber` `0 / 0`. `EditableSlide`:
      typing `ArrowRight` in an input inside a slide leaves `1 / 2`. `Fullscreen`: toolbar absent, overlay present.
- [ ] **Step 2:** `moon run plugin-presenter:test-storybook` → FAIL.
- [ ] **Step 3:** Implement; remove old Pager key handling; delete `Layout`, `PresenterContext`, `StartButton`.
- [ ] **Step 4:** PASS; typecheck; lint.
- [ ] **Step 5:** Commit `plugin-presenter: Deck with toolbar, overlay pager and scoped keys`.

### Task 7: `PresentationArticle`, `SlideEditorArticle`, surfaces, fullscreen

**Files:**

- Create: `src/containers/PresentationArticle/{PresentationArticle.tsx,PresentationArticle.stories.tsx,index.ts}`,
  `src/containers/SlideEditorArticle/{SlideEditorArticle.tsx,SlideEditorArticle.stories.tsx,index.ts}`,
  `src/components/SectionPicker/{SectionPicker.tsx,index.ts}`
- Modify: `src/containers/index.ts`, `src/capabilities/react-surface.ts`, `src/useExitPresenter.ts`,
  `src/operations/set-presenting.ts` (accept `Presentation`), `package.json` (deps `@dxos/react-ui-form`,
  `@dxos/echo-doc`)
- Delete: `src/containers/CollectionArticle/`

**Interfaces:**

- Consumes: `usePresentationDeck`, `useSlideIndex`, `Deck`, `Presentation.addSlide/link`, `SetPresenting`.
- Produces:
  - `PresentationArticle({ role, subject: Presentation.Presentation })`: `contextId = Obj.getURI(subject)`;
    `fullscreen = useIsPresenting(subject)` (per object, not the global layout mode); `onFullscreenChange(next)` invokes
    `SetPresenting { object: subject, state: next }`; toolbar slot holds `SectionPicker` and an "Add slide"
    `IconButton` (`Presentation.addSlide(subject, '# New slide')`).
  - `SectionPicker({ presentation })`: `ObjectPicker` from `@dxos/react-ui-form` over
    `TypeOptions.filterListedObjects(useQuery(db, Filter.everything()))`, excluding the presentation and its current
    targets; `onSelect` → `Presentation.link`. Model: plugin-projects `ObjectAddPicker`.
  - `SlideEditorArticle({ role, subject: Text.Text })`: two columns — editor (`automerge(Doc.createAccessor(text,
['content']))` + markdown extensions; model `plugin-inbox` `EventBodyEditor`) and `SlideRenderer` preview.
  - Surfaces: `presentation` → `AppSurface.object(AppSurface.Article, Presentation.Presentation)` →
    `PresentationArticle`, `position: Position.first`; `slide-editor` → Article for `Text.Text` whose
    `Obj.getParent` is a `Presentation` → `SlideEditorArticle`. Remove the `collection` surface.

- [ ] **Step 1:** Stories (`withClientProvider({ types: [Presentation.Presentation, Text.Text, Markdown.Document],
createIdentity, createSpace, onCreateSpace })` creating a 3-slide presentation + one linked doc,
      `withPluginManager`, `withAttention()` outermost). `play`: `PresentationArticle` shows `1 / 4`; clicking "Add
      slide" → `1 / 5`; `SlideEditorArticle`: typing `# Hello` updates the preview heading.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS; typecheck; lint; `gen-modules`.
- [ ] **Step 5:** Commit `plugin-presenter: PresentationArticle, slide editor and section picker`.

### Task 8: App graph — folder node, children, reorder; remove collection decks

**Files:**

- Modify: `src/capabilities/app-graph-builder.ts`, `src/plugin.test.ts`
- Delete: `src/types/Settings.ts`, `src/capabilities/settings.ts`, `PresenterCapabilities.Settings`, the
  `./Settings` export (`package.json`, `vite.config.ts`, `typesVersions`), `PresenterSettings` module.
- Create: `.changeset/plugin-presenter-presentation.md` (`'@dxos/plugin-presenter': minor` — new `Presentation`
  type; collection decks and `Settings` removed).

**Interfaces:**

- Consumes: `Presentation`, `ContainerModel`, `AppNode.makeObject`, `AppNode.getListPartials`.
- Produces:
  - Extension `presentation-sections` (`relation` child): matches `Obj.instanceOf(Presentation.Presentation,
node.data)`; connector maps `sections` (reactive, as in plugin-space `collections.ts` `getMembers`) to
    `AppNode.makeObject({ get, db, object: target, navigable: true })`; parent properties spread
    `AppNode.getListPartials(ContainerModel.make(presentation, 'sections', { removeLabel }), db)` so navtree
    drag-reorder writes `sections`.
  - Companion extension `root` matches `Markdown.Document` only (collections dropped); action unchanged.

- [ ] **Step 1:** `plugin.test.ts`: create a presentation with 2 owned slides + 1 linked doc in the harness space;
      expand its graph node; assert 3 children in `sections` order; call the node's `onRearrange` with reversed order →
      `sections` reversed. Assert no `Settings` module is active.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; delete settings; `gen-modules`.
- [ ] **Step 4:** `moon run plugin-presenter:test` and `:test-storybook` PASS; `moon run plugin-presenter:lint`;
      `pnpm knip` shows no new unused files/deps for the package.
- [ ] **Step 5:** Commit `plugin-presenter: presentation folder in the navtree; drop collection decks`.

### Task 9: Spec, ledger, end-to-end check

**Files:**

- Modify: `PLUGIN.mdl` (types, components, features, scenarios, QA; `## Changelog` entry attributed `user:` for the
  design decisions and `agent:` for plan decisions 1–5), `dx.config.ts` description, `docs/TASKS.md` (check Phase 1),
  `docs/DESIGN.md` (Phases → 1: preview companion stays on reveal until Phase 3)

- [ ] **Step 1:** Update spec and docs.
- [ ] **Step 2:** Run the app (`run` skill / composer dev server): create a Presentation from the space menu, add a
      slide, link a markdown doc, reorder in the navtree, press `f`, step with arrows, ESC, reload → same slide.
      Capture screenshots.
- [ ] **Step 3:** `pnpm format`; full package `test`, `test-storybook`, `lint`, typecheck.
- [ ] **Step 4:** Commit `plugin-presenter: Phase 1 spec and ledger`.

### Task 10: Demo presentation story _(user request, 2026-10-22)_

**Files:**

- Create: `src/stories/Demo.stories.tsx` (title
  `plugins/plugin-presenter/stories/Demo`), `src/testing/demoPresentation.ts` (imported directly by the story, not
  exported from `#testing`, which stays light)

**Interfaces:**

- Consumes: `Presentation.make`, `Presentation.link`, `PresentationArticle` (Task 7), the story decorators used in
  Task 7.
- Produces: `createDemoPresentation(db): Presentation.Presentation` — a 10-slide deck that exercises Phase 1: a
  title slide, bullet slides, a code slide, the existing `Slide` frontmatter layouts (`image` with `layout:
fullscreen`, `columns`, `rows`), and two linked objects (a `Markdown.Document`, plus one object from another
  plugin whose slide surface is available in the story, e.g. a `Table` or `Drawing`; otherwise a second document).
  Content describes the presenter itself (what a Presentation is, how to add slides, keys).

- [ ] **Step 1:** Story `Demo` renders `PresentationArticle` for the demo deck in a fullscreen layout;
      `play` asserts `1 / N`, steps with `ArrowRight` to the linked-document slide and asserts its heading.
- [ ] **Step 2:** `moon run plugin-presenter:test-storybook` → FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `plugin-presenter: demo presentation story`.
