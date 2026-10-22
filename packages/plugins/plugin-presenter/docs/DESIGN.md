# plugin-presenter — Design

Status: **draft for discussion** (2026-10-22). Decisions marked _agent call_ are proposals, not agreed.

## Intent

Present anything in Composer as a slide deck. A deck is either one markdown document cut into slides, or a
collection whose objects are each a slide. Any plugin can make its objects presentable by contributing a slide
surface. An assistant can turn a markdown outline into a deck.

## Goals

1. Two deck formats, one runtime: **document decks** (markdown split into slides) and **collection decks**
   (one object per slide).
2. Any plugin contributes a `role=slide` surface for its schema (canvas, sheet, drawing, table, …).
3. The presenter article toggles in and out of fullscreen in place, and always shows the pager.
4. One pager primitive, shared with autocue and reconciled with `react-ui` `Carousel`.
5. A markdown slide renderer we control: live re-render on edit, our theme tokens, our key bindings.
6. An assistant skill: markdown outline → presentation.

## Non-goals

- Slide authoring UI (WYSIWYG layout editor). Authoring stays in the markdown editor or the object's own plugin.
- Transitions, auto-animate, overview grid (reveal.js features we would drop).
- Server-side or headless PDF export. Print-to-PDF only.

## Anti-goals

- Two markdown renderers that show the same markdown differently (today: reveal.js for document decks,
  ReactMarkdown for markdown slides in a collection deck).
- Global CSS or global key listeners leaking out of the deck (today: reveal theme CSS; `Pager`'s `window`
  keydown).
- A slide surface that needs the presenter to know about its schema.

## Current state

| Area            | Today                                                                                                                                          | Problem                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry           | `~presenter` companion on `Markdown.Document` and (behind the `presentCollections` setting) `Collection`; action `SetPresenting` (Shift+Mod+P) | Collections are experimental.                                                                                                                        |
| Fullscreen      | `SetPresenting` → `DeckOperation.Adjust({type:'fullscreen'})`; containers read `layout.mode === 'solo--fullscreen'`                            | No in-article toggle; exit only via ESC or the action.                                                                                               |
| Document deck   | `DocumentArticle` → `PresentationShell` → `RevealPlayer` (reveal.js, `---` separators)                                                         | Reveal parses once at init, global theme CSS, owns the keyboard, no pager. Vertical slides (`----`) promised in PLUGIN.mdl F-2.2 are not configured. |
| Collection deck | `CollectionArticle` → `PresentationShell` → `Layout` (corner slots) + `Pager`/`PageNumber` → `Surface role=slide`                              | `Pager` keys gated on `PresenterContext.running`, which has **no provider**, so keys never work. Indexes `objects[slide]` refs directly.             |
| Slide surfaces  | Markdown (presenter `SlideArticle` = `Panel` + `Slide`), Table, Drawing (illustrator), File                                                    | Sheet, canvas, tldraw, outline have none. No fallback when a schema has no slide surface.                                                            |
| Pager           | `Pager` (first/prev/next/last, `window` keydown), `PageNumber`, `StartButton` (stories only)                                                   | Duplicates `Carousel` triggers; error-prone controlled/uncontrolled state.                                                                           |
| Assistant       | None                                                                                                                                           | —                                                                                                                                                    |

## Design

### 1. Model: a deck is a list of slides

```ts
type SlideSource =
  | { kind: 'markdown'; id: string; content: string; meta: SlideMeta } // one section of a document deck
  | { kind: 'object'; id: string; object: Ref<Obj.Unknown> }; // one item of a collection deck

type Deck = { slides: SlideSource[] };
```

- `useDocumentDeck(document)` parses the document into `SlideSource[]` (see §5); memoized per slide so an edit
  re-renders only the changed slide.
- `useCollectionDeck(collection)` maps `collection.objects` to `SlideSource[]`, resolving refs lazily.
- Both feed one `Deck` runtime component. The two containers collapse into one `PresentationArticle` that picks
  the hook by subject type.

**Decided (Q1, user):** a `Presentation` ECHO type that owns an ordered list of sections. The user creates a
Presentation explicitly. Each section is either an owned markdown `Text` (written inline in the presentation)
or a link to another ECHO object (markdown document, canvas, sheet, …). The app graph shows the Presentation as
a folder whose children are its slides. This replaces collection decks.

Schema sketch (_agent call_ on shape; open to change):

```ts
const Presentation = Schema.Struct({
  name: Schema.optional(Schema.String),
  // Owned `Text` sections are parented to the presentation; linked objects keep their own parent.
  sections: Schema.Array(Ref.Ref(Obj.Unknown)),
}).pipe(Type.object({ typename: 'org.dxos.type.presentation', version: '0.1.0' }));
```

- Owned vs linked is read from the target's parent (`Obj.getParent(target) === presentation`), so one array keeps
  the order and no wrapper struct is needed. Deleting an owned section deletes its `Text`; unlinking a linked one
  leaves the object.
- App graph: `Presentation` node → one child per section, labelled by the first heading (owned `Text`) or the
  object's own label (linked). Reorder by drag in the navtree writes `sections`.
- **Decided (Q2, user):** one section is exactly one slide. `---` inside a section's text is a horizontal rule,
  not a slide break. The navtree, the pager count and `sections` always agree.
- The `Deck` runtime above maps `sections` to `SlideSource[]`; owned `Text` and linked `Markdown.Document`
  both render with the markdown slide renderer, everything else through `Surface role=slide`.

### 2. Slide surface contract

- Role stays `AppSurface.Slide` (`org.dxos.role.slide`, `SectionData`).
- The presenter renders every slide inside a **`SlideFrame`**: a fixed 16:9 logical canvas (today's `Panel`
  scaling logic) so contributors design for one size.
- Contract for contributors: render read-only, fill the frame, no own toolbar/chrome, no global key listeners.
  Data: `{ subject, attendableId }`.
- Markdown slides are a slide surface like any other: the presenter contributes `role=slide` for
  `Markdown.Document`, and the document deck renders its sections with the same component.
- Fallback when no plugin matches: render the object's `Card` surface centred in the frame (_agent call_; Q3).
- Follow-up contributions: sheet, canvas, tldraw (reads the role but registers no filter), outline.

### 3. Presentation article: fullscreen toggle and pager

```
PresentationArticle
└─ Panel.Root
   ├─ Panel.Toolbar   [◀◀ ◀  3 / 12  ▶ ▶▶] ··· [⛶ fullscreen]   (hidden in fullscreen)
   └─ Panel.Body
      └─ PresentationShell  (focus scope, fade, ESC in fullscreen)
         ├─ SlideFrame → current slide
         └─ Pager overlay (fullscreen only; auto-hides after idle, shows on mouse move)
```

- Fullscreen toggle button and `F` key call `SetPresenting` / `DeckOperation.Adjust` (no new layout mode).
- Keys bind on the shell's focus scope, not `window`: ←/→ step, Shift+←/→ first/last, Home/End, ESC exits
  fullscreen. Remove `PresenterContext` (no provider exists) and `StartButton`.
- `PresentationShell` absorbs `Layout`'s corner slots, which also removes the `[ESC]` hint / `topLeft` overlap.
- Current slide index is ephemeral per article (_agent call_; Q4 asks whether to persist or sync it).

### 4. One pager primitive

- New composite in `@dxos/react-ui`: `Pager.Root` (`index`, `count`, `onIndexChange`, `loop?`), `Pager.First`,
  `Pager.Prev`, `Pager.Next`, `Pager.Last`, `Pager.Count` (`3 / 12`), `Pager.Indicators` (dots). Fully
  controlled; keyboard opt-in through a `Pager.Keys` that binds to a given element, never `window`.
- `Carousel` keeps the Ark/zag implementation but its `PrevTrigger`/`NextTrigger`/`IndicatorGroup` share the
  pager's visuals (_agent call_: share styles, not code; Q5).
- autocue: no pager exists in `tools/autocue` on this branch; `Frame.stories.tsx` `TakeStory` hand-rolls one
  (play/pause, next, `n / N`). The autocue-ui project (draft #14028) may add one — reconcile with that branch
  before building.

### 5. Markdown slide renderer (replaces reveal.js)

Research (Oct 2026): no embeddable library beats building our own. Slidev has the best authoring model but is a
Vue/Vite build tool; Marp renders pure HTML strings with no navigation; Spectacle brings its own styling and
global keys; reveal.js 6 still parses markdown only at init and ships global theme CSS.

Pipeline: `remark-parse` + `remark-gfm` + `remark-frontmatter` + `remark-directive` → split on `---` → per-slide
`remark-rehype` → `hast-util-to-jsx-runtime` (React elements, no `innerHTML`) → existing code highlighter.

DSL (Slidev/Quarto/Presenterm conventions):

```markdown
---
theme: dark # deck frontmatter (first block)
---

# Title slide

---

layout: two-cols # per-slide frontmatter
background: ./image.png
---

## Left

:::right
![](chart.png)
:::

- one
- two <!-- pause -->
- three

:::notes
Speaker notes.
:::
```

- Layouts: `title`, `section`, `default`, `two-cols`, `image-left`, `image-right`, `fullscreen-image`
  (subsumes today's `slideLayout` `fullscreen`/`columns`/`rows`).
- Fragments: `<!-- pause -->`. Notes: `:::notes`. Embedded objects: _open_ (Q2).
- Migration: map reveal's `<!-- .slide: -->` / `<!-- .element: class="fragment" -->` to the DSL; keep
  `RevealPlayer` behind a setting until parity, then delete it.
- Print: a print stylesheet, one slide per page.

### 6. Assistant skill

- `PresenterSkill` (`src/skills/`), contributed via `AppCapabilities.SkillDefinition`, linked from
  `Markdown.Document` / `Collection` through `Skill.SkillsAnnotation` only if those owners agree (Q6).
- Operations exposed as tools:
  - `CreatePresentation({ title, outline, format: 'document' | 'collection', target? })` — the model expands the
    outline into DSL markdown itself; the operation parses and validates it (unknown layouts, empty slides) and
    either writes one `Markdown.Document` or one document per slide plus a `Collection`.
  - `ListLayouts()` — the DSL reference, so the instructions don't embed it.
  - `PresentObject({ object })` — wraps `SetPresenting`.
- "Markdown outline" input: any markdown with headings/bullets; `Outline` (`org.dxos.type.outline`) checklists
  accepted too.
- Evals: one `assistant-evals` eval with memoized fixtures (outline → deck, checks slide count and layouts).

## Phases

1. **Runtime unification** — `Deck` model, `PresentationArticle`, `SlideFrame`, in-article fullscreen toggle,
   pager toolbar + overlay, focus-scoped keys; delete `PresenterContext`, `StartButton`, `Layout`. Reveal stays
   as the document renderer.
2. **Pager primitive** in `@dxos/react-ui`; presenter adopts it; Carousel/autocue reconciled.
3. **Markdown renderer + DSL**; document decks move off reveal.js behind a setting; migrate test decks.
4. **Slide surfaces** for sheet, canvas, tldraw; `Card` fallback; collection decks out of experimental.
5. **Assistant skill** + eval.
6. Update `PLUGIN.mdl` (features, scenarios, changelog) at each phase.

## Open questions

1. Do we need a `Presentation` ECHO object (title, theme, source ref, last slide), or is "a companion on a
   document/collection" enough?
2. Should a document deck embed objects as slides (e.g. a `::object{ref=…}` directive), which would make
   collection decks a special case of document decks?
3. Fallback for objects with no slide surface: `Card` surface, a title slide with the object's name, or skip?
4. Slide index: ephemeral, persisted per user, or synced across viewers (audience follows presenter)?
5. Pager vs Carousel: share styling only, or rebuild `Carousel` on top of `Pager`?
6. Skill trigger: annotate `Markdown.Document`/`Collection` with the skill, or enable it only on request?
7. Presenter view (notes + next slide in a second window) — in scope now or later?

## References

- `packages/plugins/plugin-presenter/PLUGIN.mdl` — current spec (stale: "solo fullscreen", vertical slides).
- `packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.ts:379` — `AppSurface.Slide`.
- `packages/ui/react-ui/src/components/Carousel/Carousel.tsx` — Carousel.
- `packages/plugins/plugin-markdown/src/skills/MarkdownSkill.ts` — skill pattern.
- Slidev https://sli.dev · Marp https://github.com/marp-team/marp-core · Quarto revealjs
  https://quarto.org/docs/presentations/revealjs/ · Presenterm https://github.com/mfontanini/presenterm ·
  hast-util-to-jsx-runtime https://github.com/syntax-tree/hast-util-to-jsx-runtime
