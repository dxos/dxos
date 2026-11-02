# Presenter Phase 3 — Slidev-subset markdown renderer: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace reveal.js and ReactMarkdown with our own renderer for a strict Slidev subset plus DXOS
extensions (video backgrounds, embedded `<Surface>`s), used by owned slides, linked markdown documents and the
markdown preview companion.

**Architecture:** A pure pipeline in `src/markdown/` (split → parse with unified/remark → transform to a slide
model → render to React with `hast-util-to-jsx-runtime`); layouts are React components in
`src/components/MarkdownSlide/`; the `Deck` gains click steps; `DocumentArticle` moves onto the `Deck`; reveal.js,
ReactMarkdown and the old `Slide` are deleted.

**Tech Stack:** unified 11, remark-parse, remark-gfm, remark-frontmatter, remark-rehype, hast-util-to-jsx-runtime,
`yaml`, Effect Schema, React, Tailwind, `@dxos/react-ui-syntax-highlighter`, vitest (node + storybook).

**Spec:** [DESIGN.md](./DESIGN.md) §6 and Phases → 3.

## Global Constraints

- Syntax is a **strict Slidev subset** (DESIGN §6 table): per-slide frontmatter `layout`, `image`, `background`,
  `class`, `title`; headmatter `title`, `aspectRatio` (preview only); layouts `default`, `cover`, `center`,
  `section`, `intro`, `end`, `fact`, `statement`, `quote`, `two-cols`, `two-cols-header`, `image`, `image-left`,
  `image-right`, `full`, `none`; slots `::left::`, `::right::`, `::default::`; clicks `<v-click>`, `<v-clicks>`
  (`depth`, `every`), `<v-after>`; notes = last `<!-- … -->` of the slide; code = language + static line
  highlight `{2,4-5}`.
- DXOS extensions: frontmatter `backgroundVideo` (looping, muted, autoplay), `backgroundOpacity`,
  `backgroundPosition`; inline `<Surface ref="echo:///<id>" role="slide|section|card" />` (role defaults to
  `slide`; fallback `slide` → `section` → `card` → title slide).
- All raw HTML other than the allowlisted tags (`v-click`, `v-clicks`, `v-after`, `Surface`, `br`) is escaped,
  never rendered. No `dangerouslySetInnerHTML` anywhere.
- One section of a `Presentation` is one slide; `---` splits slides only in the markdown preview companion.
- Slides render on the fixed 2560×1440 `SlideFrame` canvas; sizes in layouts assume it.
- Deps via `pnpm add --filter "@dxos/plugin-presenter" --save-catalog <pkg>` (adds missing catalog entries);
  in-repo deps `workspace:*`. No casts (`as any`, `!`); relative imports carry `.ts`/`.tsx`.
- `src/markdown/*` is headless (no React import) so node/workerd capability slices stay React-free; run
  `moon run plugin-presenter:check-module-structure` after touching imports.
- Every `PLUGIN.mdl` change adds a `## Changelog` entry.

## Plan decisions (agent calls — review)

1. **No `@slidev/parser`.** It is not in the repo and targets Node; the splitter is ~60 lines we own (Task 1).
2. **reveal.js is deleted in this phase, not put behind a setting.** The `Settings` module was removed in Phase 1;
   reintroducing one for a temporary toggle costs more than converting the two decks (Task 8) first.
3. **Going back with ← lands on the previous slide fully revealed** (all click steps shown), as Slidev does.
4. **Click steps are ephemeral** (reset on slide change); only the slide index is view state.
5. **Code blocks use `SyntaxHighlighter`** from `@dxos/react-ui-syntax-highlighter` (inline styles), dropping the
   global highlight.js CSS imports.

## Review Focus

1. **Raw HTML / script injection** (`<script>`, `<img onerror>`, `<iframe>`) — rendered as escaped text, never
   executed. Test in Task 2.
2. **`---` inside a fenced code block** in a preview document — not a slide break. Test in Task 1.
3. **Malformed frontmatter YAML** — the slide body still renders; the frontmatter is ignored and a validation
   issue is reported, no crash. Test in Task 2.
4. **Unknown `layout` name** — renders with `default`; `validateSlide` reports it. Test in Tasks 2 and 4.
5. **`<Surface ref>` to a missing or deleted object, or a malformed URI** — a "missing object" placeholder slide
   region, no crash, no spinner forever. Test in Task 5.

---

### Task 1: Slide splitter (preview) and frontmatter schema

**Files:**

- Create: `src/markdown/split.ts`, `src/markdown/frontmatter.ts`, `src/markdown/index.ts`,
  `src/markdown/split.test.ts`, `src/markdown/frontmatter.test.ts`; add `#markdown` to `package.json` `imports`
  and a vite entry `markdown: 'src/markdown/index.ts'`.

**Interfaces:**

- Produces:
  - `splitSlides(markdown: string): string[]` — Slidev rule: a line `---` separates slides; a `---` that is
    immediately followed by YAML and a closing `---` opens that slide's frontmatter (kept with the slide); the
    first slide's frontmatter is the headmatter. Fenced code (``` / ~~~) is never split.
  - `SlideFrontmatter` (Effect Schema, all optional): `layout`, `image`, `background`, `class`, `title`,
    `backgroundVideo`, `backgroundOpacity` (number 0–1), `backgroundPosition`; unknown keys dropped.
  - `parseFrontmatter(yaml: string): { frontmatter: SlideFrontmatter; issues: SlideIssue[] }` using `yaml`.
  - `type SlideIssue = { kind: 'frontmatter' | 'layout' | 'html'; message: string }`.
  - `LAYOUTS` (readonly tuple of the 16 names) and `type LayoutName`.

- [ ] **Step 1:** Tests: `splits on ---`; `keeps per-slide frontmatter with its slide`; `ignores --- inside fenced
code` (Review Focus 2); `empty document → ['']`; `parseFrontmatter` maps known keys, drops unknown ones,
      `backgroundOpacity: '0.5'` and `2` → issue; malformed YAML → `{ frontmatter: {}, issues: [frontmatter] }`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; add `yaml` dep. **Step 4:** PASS; typecheck.
- [ ] **Step 5:** Commit `plugin-presenter: slide splitter and frontmatter schema`.

### Task 2: Slide model (parse + Slidev transforms)

**Files:**

- Create: `src/markdown/parse.ts`, `src/markdown/remark-slidev.ts`, `src/markdown/parse.test.ts`.

**Interfaces:**

- Consumes: `parseFrontmatter`, `LAYOUTS` (Task 1).
- Produces:
  - `type ParsedSlide = { frontmatter: SlideFrontmatter; layout: LayoutName; slots: Record<'default' | 'left' |
'right', HastRoot>; notes?: string; clicks: number; issues: SlideIssue[] }` (`HastRoot` from `hast`).
  - `parseSlide(content: string): ParsedSlide` — unified: `remark-parse` → `remark-gfm` → `remark-frontmatter`
    (`yaml`) → `remarkSlidev` → `remark-rehype` (no `allowDangerousHtml`).
  - `remarkSlidev` (remark plugin): (1) the trailing HTML comment becomes `notes`; (2) paragraphs that are exactly
    `::name::` split the tree into slots; (3) `v-click`/`v-clicks`/`v-after`/`Surface`/`br` html nodes become
    mdast nodes with `data.hName` (`slide-click`, `slide-clicks`, `slide-after`, `slide-surface`, `br`) and
    `data.hProperties` (`step`, `depth`, `every`, `ref`, `role`); every other html node becomes a `text` node
    (escaped) and adds an `html` issue; (4) assigns click steps in document order and sets `clicks`.
  - Unknown layout → `layout: 'default'` + `layout` issue.

- [ ] **Step 1:** Tests: notes extracted and absent from slots; `::right::` splits into `default`/`right`;
      `<v-clicks>` over a 3-item list → `clicks: 3` and steps 1..3; `<v-after>` shares the previous step;
      `<Surface ref="echo:///A" />` → one `slide-surface` element with `ref`, `role: 'slide'`; `<script>alert(1)</script>`
      and `<img src=x onerror=…>` → text, `html` issue (Review Focus 1); malformed frontmatter → body intact
      (Review Focus 3); `layout: nope` → `default` + issue (Review Focus 4).
- [ ] **Step 2:** FAIL. **Step 3:** Implement; deps `unified`, `remark-parse`, `remark-gfm`, `remark-frontmatter`,
      `remark-rehype`, `@types/hast`/`@types/mdast` as needed (catalog). **Step 4:** PASS; typecheck;
      `check-module-structure`.
- [ ] **Step 5:** Commit `plugin-presenter: Slidev slide model`.

### Task 3: `MarkdownSlide` renderer and layouts

**Files:**

- Create: `src/components/MarkdownSlide/{MarkdownSlide.tsx,layouts.tsx,SlideBackground.tsx,theme.ts,index.ts,
MarkdownSlide.stories.tsx}`, `src/components/MarkdownSlide/MarkdownSlide.test.tsx`.

**Interfaces:**

- Consumes: `parseSlide`, `ParsedSlide` (Task 2).
- Produces:
  - `MarkdownSlide({ content: string; step?: number; onClicks?: (count: number) => void; renderSurface?:
(props: { uri: string; role: SlideSurfaceRole }) => ReactNode })` — memoizes `parseSlide(content)` on
    `content`; renders hast via `toJsxRuntime(tree, { Fragment, jsx, jsxs, components })`; `components` map:
    `slide-click`/`slide-clicks`/`slide-after` (hidden via `invisible` until `step >= their step`),
    `slide-surface` → `renderSurface` (or a labelled placeholder when absent), `pre`/`code` → `SyntaxHighlighter`
    (`scroll={false}`, static line highlights from `{…}`), headings/text with `theme.ts` classes (moved from
    `Slide/theme.ts`). Reports `parsed.clicks` through `onClicks` in an effect.
  - `type SlideSurfaceRole = 'slide' | 'section' | 'card'`.
  - `Layout` components keyed by `LayoutName`, each `({ slots, frontmatter }) => ReactNode`; slot placement per
    Slidev's built-ins (e.g. `two-cols` → left = `default`, right = `right`; `image-right` → content left,
    `frontmatter.image` right).
  - `SlideBackground({ frontmatter })` — `background` (CSS color or image URL), `image` for image layouts,
    `backgroundVideo` (`<video autoPlay muted loop playsInline>`), `backgroundOpacity`, `backgroundPosition`.

- [ ] **Step 1:** Tests (`renderToStaticMarkup`, no DOM): heading uses the accent class; `step={0}` hides click
      items, `step={2}` shows two of three; `two-cols` places `::right::` content in the right column; code block
      renders highlighted spans; `backgroundVideo` renders `video[autoplay][muted][loop]`; raw `<script>` text is
      escaped in the markup.
- [ ] **Step 2:** Story `Layouts` (one story per layout, args = sample markdown) and `VideoBackground` (inline
      data-URI or a tiny local asset; no network). `play` asserts a layout-specific element per story.
- [ ] **Step 3:** FAIL. **Step 4:** Implement; deps `hast-util-to-jsx-runtime`, `@dxos/react-ui-syntax-highlighter`.
- [ ] **Step 5:** PASS (`test`, `test-storybook`); typecheck; lint. Commit
      `plugin-presenter: MarkdownSlide renderer and layouts`.

### Task 4: Wire `MarkdownSlide` into slides; delete `Slide`

**Files:**

- Modify: `src/components/SlideRenderer/SlideRenderer.tsx` (text slides use `MarkdownSlide`),
  `src/containers/SlideArticle/SlideArticle.tsx` (linked `Markdown.Document` slide), `src/testing/demoPresentation.ts`
  (frontmatter `columns|rows|fullscreen` → `image-left|image-right|image`/`two-cols` per DESIGN §6 mapping),
  `stories/Demo.stories.tsx` assertions.
- Delete: `src/components/Slide/` (and its stories), `styles.css`; deps `react-markdown`, `rehype-add-classes`,
  `rehype-highlight`, `remark-parse-frontmatter`, `hastscript` if unused.

**Interfaces:**

- Consumes: `MarkdownSlide` (Task 3).
- Produces: unchanged `SlideRenderer` props.

- [ ] **Step 1:** Update the Demo story `play` to the new layouts (still asserts `pre code`, image backgrounds,
      linked headings); add a `SlideRenderer` story `UnknownLayout` that renders with `default` (Review Focus 4).
- [ ] **Step 2:** FAIL. **Step 3:** Implement; remove the old component and deps. **Step 4:** PASS; `pnpm knip`
      production pass clean for the package; `check-module-structure`. Commit
      `plugin-presenter: render slides with MarkdownSlide`.

### Task 5: Embedded surfaces

**Files:**

- Create: `src/components/SlideRenderer/ObjectSurface.tsx` (extracted from `ObjectSlide`),
  `src/components/SlideRenderer/EmbeddedSurface.tsx`; stories in `SlideRenderer.stories.tsx`.
- Modify: `SlideRenderer.tsx` (`ObjectSlide` uses `ObjectSurface`; text slides pass `renderSurface`).

**Interfaces:**

- Consumes: `MarkdownSlide.renderSurface`, `SlideSurfaceRole` (Task 3); `Surface.matchCandidates`,
  `Surface.useIsAvailable`, `surfaceManager.candidatesAtom` (existing `ObjectSlide` logic).
- Produces:
  - `ObjectSurface({ object: Obj.Unknown; role: SlideSurfaceRole; attendableId?: string })` — fallback chain
    `AppSurface.Slide` → `AppSurface.Section` → `AppSurface.CardContent` → `TitleSlide`, starting at `role`,
    with the existing reactive candidate subscription and demand per role.
  - `EmbeddedSurface({ uri: string; role: SlideSurfaceRole; db: Database })` — `EID.tryParse`/`URI.make` →
    `db.makeRef` → `useResolveRef`; malformed URI or missing/deleted target → a "Missing object" placeholder
    (translation `missing-object.label`) (Review Focus 5); unloaded → spinner.

- [ ] **Step 1:** Stories: `EmbeddedSurface` (a `two-cols` slide with text left and `<Surface ref=…>` of a
      `Markdown.Document` right, using the story slide surface) asserting both the text and the embedded document's
      heading; `EmbeddedSurfaceMissing` (ref to a deleted object and a malformed ref) asserting the placeholder.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS; typecheck; lint. Commit
      `plugin-presenter: embedded surfaces in slides`.

### Task 6: Click steps in the Deck

**Files:**

- Modify: `src/components/Deck/Deck.tsx`, `Deck.stories.tsx`, `src/components/SlideRenderer/SlideRenderer.tsx`
  (forward `step`/`onClicks`).

**Interfaces:**

- Consumes: `MarkdownSlide` `step`/`onClicks` (Task 3).
- Produces: `Deck` keeps `[step, setStep]` (ephemeral) and the current slide's `clicks`; → / Space: `step <
clicks ? step + 1 : next slide (step 0)`; ←: `step > 0 ? step - 1 : previous slide fully revealed (step =
Infinity until its clicks report)`; Shift/Home/End jump slides with `step = 0`; the pager moves slides only.
  `PageNumber` unchanged.

- [ ] **Step 1:** Story `ClickSteps` (slide 1 with `<v-clicks>` of 3 items, slide 2 plain): → ×3 reveals items
      and stays `1 / 2`; 4th → shows `2 / 2`; ← shows `1 / 2` with all 3 items visible.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. Commit `plugin-presenter: click steps`.

### Task 7: Markdown preview companion on the Deck

**Files:**

- Modify: `src/deck/SlideSource.ts` (add `{ kind: 'markdown'; id: string; content: string }`),
  `src/components/SlideRenderer/SlideRenderer.tsx`, `src/containers/DocumentArticle/DocumentArticle.tsx`,
  `src/hooks/` (new `useDocumentDeck.ts`).
- Delete: `src/components/RevealPlayer/` and the `reveal.js` dep.

**Interfaces:**

- Consumes: `splitSlides` (Task 1), `Deck` (Task 6), `useSlideIndex`, `useIsPresenting`, `useSetPresenting`.
- Produces: `useDocumentDeck(document: Markdown.Document): SlideSource[]` — `splitSlides` over the document's
  live content, ids `${document.id}:${index}`; `DocumentArticle` renders `Deck` like `PresentationArticle`
  (no toolbar actions; headmatter `title` ignored for now).

- [ ] **Step 1:** Story `DocumentArticle/Default` from `testing/deck.md` (after Task 8's conversion, use a small
      inline deck now): `1 / N`, → steps, `f` calls `SetPresenting`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement; remove RevealPlayer, reveal.js, `@types/reveal.js`.
- [ ] **Step 4:** PASS; `knip` production pass; `check-module-structure`. Commit
      `plugin-presenter: preview companion on the deck runtime`.

### Task 8: Convert the DXOS decks

**Files:**

- Modify: `testing/deck.md`, `testing/2025-05-20-effect.md`; stories that import them.

- Conversion rules: `.slide: data-background="#…"` → `background: '#…'`; `data-background-image/opacity/position`
  → `image`/`background` + `backgroundOpacity`/`backgroundPosition`; `data-background-video` (+ loop) →
  `backgroundVideo`; `data-background-transition`, `data-visibility` → dropped (note in the commit);
  `.element: class="!text-center…"` and `<center>` → `layout: center` or `class:`; `<img style="height:200px">` →
  markdown image inside a slide with `class:` sizing; `<br>` kept (allowlisted).

- [ ] **Step 1:** Story `DXOSDeck` (preview companion over `deck.md`) asserting the first slide has a `video`
      background and slide 2 shows the DXOS logotype; story `EffectTalk` over `2025-05-20-effect.md` asserting slide
      count 17 and a code slide.
- [ ] **Step 2:** FAIL. **Step 3:** Convert. **Step 4:** PASS; no `html` issues reported for either deck
      (assert via `parseSlide` in a node test over `splitSlides(file)`). Commit `plugin-presenter: convert DXOS decks`.

### Task 9: Print, spec, docs, changeset

**Files:**

- Create: `src/components/MarkdownSlide/print.css` (imported once by `Deck`): `@media print` one slide per page,
  all click steps shown, chrome hidden.
- Modify: `PLUGIN.mdl` (components, features, QA; changelog `user:` D for embedded surfaces + video backgrounds;
  `agent:` D for plan decisions 1–5), `docs/DESIGN.md`, `docs/TASKS.md`, `.changeset/plugin-presenter-renderer.md`
  (`'@dxos/plugin-presenter': minor` — new renderer, reveal.js removed).

- [ ] **Step 1:** Update spec/docs; `check-changelog`, `lint-mdl`. **Step 2:** Full package `test`,
      `test-storybook`, `lint`, typecheck, `knip`; running-app check (open a Presentation and a markdown preview,
      step clicks, fullscreen, print preview). **Step 3:** Commit `plugin-presenter: Phase 3 spec and docs`.
