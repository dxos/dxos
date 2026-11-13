# plugin-presenter — Design

Status: **Phases 1 and 3 implemented; code is the truth, spec in PLUGIN.mdl** (2026-10-22; Q8 slide syntax added). Items marked _agent call_ were settled by the agent
and are open to review; everything marked _user_ was decided in discussion.

## Intent

Present anything in Composer as a slide deck. A user creates a **Presentation**: an ordered list of sections,
each either a markdown slide written in place or a link to another object (document, canvas, sheet, …). Any
plugin makes its objects presentable by contributing a slide surface. A markdown document can still be previewed
as a deck directly. An assistant can turn a markdown outline into a presentation.

## Goals

1. A `Presentation` type: ordered sections, one slide each, shown in the navtree as a folder of slides.
2. A quick-preview companion that presents any markdown document split on `---`.
3. Any plugin contributes a `role=slide` surface for its schema; objects without one still render.
4. The presentation article toggles in and out of fullscreen in place, and always shows the pager.
5. One `Pager` primitive in `@dxos/react-ui`, styled consistently with `Carousel`, used by autocue too.
6. A markdown slide renderer we control: live re-render on edit, our theme tokens, our key bindings.
7. An assistant skill: markdown outline → presentation.

## Non-goals

- A WYSIWYG slide layout editor. Authoring stays in the markdown editor or the linked object's own plugin.
- Transitions, auto-animate, overview grid (reveal.js features we drop).
- Server-side or headless PDF export. Print-to-PDF only.
- A presenter view (notes + next slide + timer). Later; see Phase 6.

## Anti-goals

- Two markdown renderers that show the same markdown differently (today: reveal.js for document decks,
  ReactMarkdown for markdown slides in collection decks).
- Global CSS or global key listeners leaking out of the deck (today: reveal theme CSS; `Pager`'s `window`
  keydown).
- A slide surface that requires the presenter to know about its schema.
- Slide position shared between collaborators.

## Baseline (before Phase 1)

What the plugin did before this design; kept as context, not current guidance.

| Area            | Before Phase 1                                                                                                                     | Problem                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Entry           | `~presenter` companion on `Markdown.Document` and (behind `presentCollections`) `Collection`; action `SetPresenting` (Shift+Mod+P) | Collections experimental; no first-class deck object.                                                                          |
| Fullscreen      | `SetPresenting` → `DeckOperation.Adjust({type:'fullscreen'})`; containers read `layout.mode === 'solo--fullscreen'`                | No in-article toggle; exit only via ESC or the action.                                                                         |
| Document deck   | `DocumentArticle` → `PresentationShell` → `RevealPlayer` (reveal.js, `---`)                                                        | Parses once at init, global theme CSS, owns the keyboard, no pager. `----` vertical slides in PLUGIN.mdl F-2.2 not configured. |
| Collection deck | `CollectionArticle` → `PresentationShell` → `Layout` + `Pager`/`PageNumber` → `Surface role=slide`                                 | Keys gated on `PresenterContext.running`, which has **no provider**, so keys never work. Indexes refs directly.                |
| Slide surfaces  | Markdown (`SlideArticle` = `Panel` + `Slide`), Table, Drawing, File                                                                | Sheet, canvas, tldraw, outline have none; no fallback.                                                                         |
| Pager           | `Pager` (`window` keydown), `PageNumber`, `StartButton` (stories only)                                                             | Duplicates `Carousel` triggers; error-prone controlled/uncontrolled state.                                                     |
| Assistant       | None                                                                                                                               | —                                                                                                                              |

## Design

### 1. The `Presentation` type _(user)_

```ts
const Presentation = Schema.Struct({
  name: Schema.optional(Schema.String),
  // Owned `Text` sections are parented to the presentation; linked objects keep their own parent.
  sections: Schema.Array(Ref.Ref(Obj.Unknown)),
}).pipe(Type.object({ typename: 'org.dxos.type.presentation', version: '0.1.0' }));
```

- The user creates a Presentation explicitly (space "create object" menu). It is tagged as a collection item
  (`Collection.ItemTag`), so it is filed into the space's Collections like a document, and an unnamed one shows
  "New presentation". It replaces collection decks; the `presentCollections` setting and `CollectionArticle`
  are removed.
- A section is either an **owned markdown `Text`** or a **link** to any ECHO object. Owned vs linked is read from
  the target's parent (`Obj.getParent(target) === presentation`) so one array keeps the order (_agent call_).
  `Presentation.remove` deletes an owned `Text` and only unlinks a linked object. In the navtree an owned slide
  has **no** remove action: the space's undoable Delete is the only way to delete it; a linked section keeps
  "Remove from presentation", which only unlinks (_agent call_). Ownership is set explicitly
  when a slide is created (`Obj.setParent` after the ref exists), not by a `SetParent` annotation on `sections`,
  which would also adopt linked parentless objects (_agent call_).
- **Ownership wins** _(agent call)_: deleting a Presentation deletes its owned slides, even an owned slide that
  another Presentation or collection also links; linked objects owned elsewhere (or parentless) survive.
  `Presentation.isOwned` (a `Text` whose parent is the presentation) and the navtree's ownership rule (a `text`
  slide source) are the same test, so the deck, the folder and deletion agree.
- **One section is exactly one slide** _(user)_. `---` inside a section is a horizontal rule, not a slide break,
  so the navtree, the pager count and `sections` always agree.
- App graph: the Presentation is a folder node; each section is a child, labelled by its first heading (owned) or
  the object's own label (linked). An owned slide is labelled by its `name`, else its first heading, else
  "Slide N". Drag-reorder in the navtree writes `sections`. Clicking a child opens that slide's own article
  (the markdown editor for an owned slide) rather than the deck _(agent call)_.
- "Add to presentation": a picker over space objects with a toggle _(user)_ that filters to schemas with a
  dedicated `Slide` surface. With the toggle off, anything can be linked and renders through the fallback chain
  (§3). The filter needs a "does a surface exist for role X and schema Y" query that does not render
  (_agent call_: a lookup helper in app-framework; confirm against its API).

### 2. One deck runtime

```ts
type SlideSource =
  | { kind: 'text'; id: string; text: Text.Text } // owned slide, rendered as markdown
  | { kind: 'object'; id: string; object: Obj.Unknown } // any linked object, Markdown.Document included
  | { kind: 'markdown'; id: string; content: string; db?: Database.Database } // a raw slide of the preview companion
  | { kind: 'pending'; id: string }; // a section whose target has not loaded yet
```

- `slideSourcesAtom(presentation)` (an atom family; `usePresentationDeck` reads it) maps `sections` to
  `SlideSource[]`, resolving each ref on its own so the order holds while targets load. A section whose target
  was **deleted** is omitted; one not yet loaded stays `pending` (_agent call_). The navtree folder reads the
  same atom, so its children are the deck's slides in deck order.
- `Deck` is rendered by `PresentationArticle`. The **quick-preview companion** _(user)_ is
  `DocumentArticle` on the shared `Deck` (reveal.js is gone), splitting the document on `---` into `markdown`
  sources that carry the document's database for embedded surfaces; nothing is persisted. The one-section-one-slide rule applies only inside a Presentation.
- `CollectionArticle` is gone. `SlideArticle` stays: it is the markdown `role=slide` surface a linked
  `Markdown.Document` renders through. `SlideEditorArticle` edits an owned slide under a 16:9 live preview.

### 3. Slide surfaces

- Role stays `AppSurface.Slide` (`org.dxos.role.slide`, `SectionData`).
- Every slide renders inside **`SlideFrame`**: a fixed 16:9 logical canvas (today's `Panel` scaling), so
  contributors design for one size.
- Contract for contributors: read-only, fill the frame, no toolbar or chrome, no global key listeners. Data:
  `{ subject, attendableId }`.
- **Fallback chain** _(user)_: `Slide` → `Section` → `CardContent` → title slide (object icon + label).
  `Section` surfaces may be editable; the frame passes the `Slide` role so plugins that honour it render
  read-only, and the frame blocks pointer edits otherwise (_agent call_).
- New contributions: sheet, canvas, tldraw (already reads the role but registers no filter), outline.

### 4. Presentation article: fullscreen toggle and pager

```
PresentationArticle
└─ Panel.Root
   ├─ Panel.Header    [+ slide] [link] ··· [⛶ fullscreen]   (hidden in fullscreen)
   ├─ Panel.Body
   │  └─ PresentationShell  (focus scope, fade, ESC in fullscreen)
   │     ├─ SlideFrame → current slide
   │     └─ Pager overlay (fullscreen only; auto-hides when idle, shows on pointer move)
   └─ Panel.Footer    status bar, centered: [⏮ ◀  3 / 12  ▶ ⏭]   (hidden in fullscreen)
```

- The fullscreen button and `F` key call `SetPresenting` / `DeckOperation.Adjust`; no new layout mode. A
  Presentation presents fullscreen on its own plank (it has no presenter companion; its article is the deck);
  a Markdown document presents through its `~presenter` companion. Fullscreen is read per object
  (`useIsPresenting`), never from the global layout mode, so toggling one deck does not remount another
  _(agent call)_.
- Keys bind on the deck's focus scope, never `window`: ←/→ step, Shift+←/→ or Home/End first/last, `f` toggles
  fullscreen, ESC exits fullscreen. `PresenterContext`, `StartButton` and `Layout` are deleted; the overlay pager lives in `Deck`, not the shell, which
  also fixes the `[ESC]` hint overlapping `Layout`'s top-left slot.
- **Current slide** _(user)_: per-user, per-deck view state in `@dxos/react-ui-attention` —
  `ViewState.define({ key: 'presenter-slide', backend: 'local', … })`, read with
  `useViewState(aspect, contextId)` where `contextId` is the Presentation's (or previewed document's) URI.
  Survives navigation and reloads; never syncs to collaborators. Operations reach it through
  `AttentionCapabilities.ViewState`. Pattern: `plugin-deck` `CompanionViewState`.

### 5. `Pager` primitive _(user)_

- New composite in `@dxos/react-ui`: `Pager.Root` (`index`, `count`, `onIndexChange`, `loop?`), `Pager.First`,
  `Pager.Prev`, `Pager.Next`, `Pager.Last`, `Pager.Count` (`3 / 12`), `Pager.Indicators` (dots), and
  `Pager.Keys` (binds keys to a given element, never `window`). Fully controlled.
- Separate from `Carousel`, which keeps its Ark/zag implementation; its `PrevTrigger`/`NextTrigger`/
  `IndicatorGroup` adopt the pager's styles (shared theme, not shared code).
- autocue has no pager on `main` (checked after autocue-ui #14028 merged); `Frame.stories.tsx` `TakeStory`
  hand-rolls play/pause, next and `n / N` and moves to `Pager`.

### 6. Markdown slide renderer (replaces reveal.js)

Research (Oct 2026): no embeddable library beats building our own. Slidev has the best authoring model but is a
Vue/Vite build tool; Marp renders HTML strings with no navigation; Spectacle brings its own styling and global
keys; reveal.js 6 still parses markdown only at init and ships global theme CSS.

**Syntax: a strict subset of Slidev** _(user)_. We render Slidev's markdown dialect ourselves, without Vue,
UnoCSS or Vite. Any slide written in the subset renders the same way in Slidev; anything outside it is rejected
by validation (assistant) or rendered as plain markdown (user edits), never silently reinterpreted. Why: models
already write Slidev fluently, so the assistant skill needs little teaching, and Slidev decks paste in.

Example slide (one Presentation section):

```text
---
layout: two-cols
class: text-center
---

# Results

<v-clicks>

- one
- two
- three

</v-clicks>

::right::

![](chart.png)

<!--
Speaker notes: the last comment in a slide (parsed and hidden now; shown by the presenter view later).
-->
```

Supported subset (v1):

| Slidev feature                                                               | Supported                                                                                                                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slide separator `---`                                                        | Preview companion only                                                                                                                                                                                 | Inside a Presentation each section is one slide (Q2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Per-slide frontmatter                                                        | `layout`, `image`, `background`, `class`, `title`                                                                                                                                                      | `title` is parsed and reserved (not rendered). Other keys (`transition`, `clicks`, `level`, …) ignored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Headmatter (first slide's frontmatter)                                       | `title`, `aspectRatio`                                                                                                                                                                                 | Preview companion only; a Presentation stores these as fields (_agent call_: added when first needed).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Layouts                                                                      | `default`, `cover`, `center`, `section`, `intro`, `end`, `fact`, `statement`, `quote`, `two-cols`, `two-cols-header`, `three-cols`, `two-by-two`, `image`, `image-left`, `image-right`, `full`, `none` | Ours, styled with our tokens; same names and slots as Slidev's built-ins, plus `three-cols` (`::middle::`, `::right::`) and `two-by-two` (`::right::`, `::bottom-left::`, `::bottom-right::`). Excluded: `iframe*` (_agent call_: revisit with a sandboxed embed).                                                                                                                                                                                                                                                                                                                                                                                   |
| Slots                                                                        | `::right::`, `::left::`, `::default::`                                                                                                                                                                 | Per the layouts that define them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Clicks                                                                       | `<v-click>`, `<v-clicks>` (`depth`, `every`), `<v-after>`                                                                                                                                              | Parsed as plain tags; no `v-click` attribute directive, no `$clicks` expressions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Speaker notes                                                                | Last `<!-- … -->` comment of the slide                                                                                                                                                                 | Markdown inside notes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Code blocks                                                                  | Language + static line highlight `{2,4-5}`                                                                                                                                                             | Click-stepped highlights `{1\|2-3}` render the first step only (_agent call_).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Vue components, `<style>` blocks, UnoCSS utilities, Monaco, LaTeX, Mermaid   | No                                                                                                                                                                                                     | Raw HTML other than the click tags, `<Surface>` and `<br>` is escaped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| DXOS extension: `backgroundVideo`, `backgroundOpacity`, `backgroundPosition` | Yes _(user, 2026-10-22)_                                                                                                                                                                               | Per-slide frontmatter beyond Slidev: a looping, muted, autoplaying video behind the slide (and image opacity/position, which reveal decks use). Slidev ignores unknown keys, so such a slide still renders there, without the video. Keeps `testing/deck.md`'s opening slide.                                                                                                                                                                                                                                                                                                                                                                        |
| DXOS extension: embedded surfaces `<Surface ref="echo:///<id>" role="…" />`  | Yes _(user, 2026-10-22)_                                                                                                                                                                               | Renders any ECHO object inside a slide through the app's surfaces, e.g. a live table or drawing beside text. `ref` is the object's ECHO URI (`echo:///<id>`, or `echo://<space>/<id>`); `role` defaults to `slide` and falls back like linked sections (`slide` → `section` → `card` → title). Allowlisted like the click tags (all other raw HTML stays escaped); placed in a layout slot it fills that slot. The editor offers it via "Insert object" (_agent call_ on syntax and role names). `![label](echo:///<id>)` is shorthand for the same embed (an image alone in its paragraph fills the slot). Slidev shows it as an unknown component. |

Pipeline: `remark-parse` + `remark-gfm` + `remark-frontmatter` → a small remark plugin that (1) takes the trailing
HTML comment as notes, (2) splits the tree on `::slot::` paragraphs, (3) turns `<v-click*>` html nodes into
click-group nodes → `remark-rehype` → `hast-util-to-jsx-runtime` (React elements, no `innerHTML`) → the existing
code highlighter. Layouts are React components receiving `{ frontmatter, slots, clickStep }`.

- The preview companion splits a document on `---` using Slidev's rule (a `---` followed by a YAML block and a
  closing `---` is that slide's frontmatter). _Agent call:_ evaluate `@slidev/parser`'s pure string parser for
  this split before writing our own; use it only if it runs in the browser without Node built-ins.
- Clicks drive the pager: → advances the click step before moving to the next slide; the pager count stays in
  slides.
- Migration: rewrite reveal syntax in `testing/*.md` (`<!-- .slide: -->`, `<!-- .element: class="fragment" -->`,
  `notes:`) to the subset; `RevealPlayer` stays behind a setting until parity, then is deleted with its
  dependency. Today's `Slide.tsx` frontmatter (`layout: fullscreen|columns|rows` + `image`) maps to `image`,
  `image-left`/`image-right` and `default`.
- Print: a print stylesheet, one slide per page, all clicks revealed.

**Themes** _(user, 2026-10-22)_. A deck has one theme, applied to every slide as `--slide-*` CSS variables
(background, text, accent, code surface, separator, body/heading/code fonts) that the layout and node classes
read.

- Built-in: `default` (app tokens; follows the app's light/dark mode), `light` and `dark` (force a mode by setting
  `color-scheme`, since the tokens use `light-dark()`; the code highlighter gets the mode through its
  `themeMode` prop), and `serif` (serif body and headings).
- Chosen by `theme:` in the first slide's headmatter, as in Slidev (whose `theme:` names an npm package; ours
  names a built-in, and an unknown name falls back to `default` with an issue).
- A Presentation's `theme` setting (`SlideTheme.Settings`: name plus accent, background, text color and font
  overrides) wins over headmatter. Linked object slides are painted with the same variables, so their surfaces
  follow a forced mode.
- Overrides accept only plain colors and font lists (_agent call_): they reach inline styles from synced data.

### 7. Assistant skill _(user)_

- `PresenterSkill` (`src/skills/`), contributed via `AppCapabilities.SkillDefinition` and attached to the
  `Presentation` type only through `Skill.SkillsAnnotation`. `agentCanEnable: true` covers "make a deck from this
  outline" before any presentation exists. Not attached to `Markdown.Document`.
- Tools (_agent call_):
  - `CreatePresentation({ name, slides: string[], target? })` — the model expands the outline into one DSL
    string per slide; the operation validates each (unknown layout, empty slide) and creates a Presentation
    with one owned `Text` per slide.
  - `AddSection({ presentation, object | content, index? })` — link an object or add an owned slide.
  - `ListLayouts()` — the supported Slidev subset (layouts, slots, frontmatter keys), so the instructions
    don't embed it. Instructions tell the model to write Slidev markdown within that subset.
  - `PresentObject({ object })` — wraps `SetPresenting`.
- Input: any markdown outline (headings, bullets); `Outline` (`org.dxos.type.outline`) checklists accepted too.
- Eval: one `assistant-evals` eval with memoized fixtures (outline → presentation; checks slide count and
  layouts).

### 8. Slide editor _(user, 2026-10-23)_

`SlideEditorArticle` edits one owned slide of a Presentation. Markdown documents keep plugin-markdown's editor
and the deck preview in their companion (Q11); the slide tools may move into that toolbar later.

- **Toolbar** (Q10), in the panel header. _Agent call:_ two rows, slide tools above formatting, since each
  `Toolbar.Root` is a full-width scroll container and two cannot share a row:
  - _Formatting:_ the shared `EditorToolbar` from `@dxos/react-ui-editor` (headings, emphasis, lists, code, link).
  - _Slide:_ a layout picker that writes the `layout:` frontmatter (thumbnails of the 16 layouts); insert a click
    step (`<v-click>` / `<v-clicks>`); insert a column break (`::right::`, offered only for layouts with slots);
    insert an object (`<Surface ref>` through the object picker); background image or video
    (`image` / `backgroundVideo` frontmatter); speaker notes (the trailing HTML comment).
  - _View:_ preview mode (split / companion); previous and next slide of the deck; "Present from here", which
    opens the deck fullscreen at this slide.
- **Preview modes** (Q9), chosen in the toolbar and kept per user in view state:
  - _Split_ (default): the editor on top and the rendered slide below, in a vertical `Splitter` from
    `@dxos/react-ui` whose position is kept with the mode.
  - _Companion_: the rendered slide in the plank's companion, so a wide screen shows editor and slide side by
    side at full height.
- **Cursor sync** (Q12), both ways:
  - _Editor → preview:_ with the cursor inside a `<v-click>` or `<v-clicks>`, the preview reveals up to that step;
    in a slotted layout the slot holding the cursor is outlined.
  - _Preview → editor:_ clicking an element in the preview moves the caret to the start of its source (no range). The parser keeps each
    node's source offsets (mdast `position`) as a `data-source` range on the rendered element; frontmatter
    offsets are added back so ranges index the whole slide.
- _Agent call:_ toolbar edits are plain text changes through the editor view (one undo step each), and the
  frontmatter is rewritten through the YAML parser so comments and key order survive.

### 9. Slides as objects _(user, 2026-10-24)_

A section was always one slide, so `Presentation.sections: Ref<Obj>[]` becomes `slides: Ref<Slide>[]`, and the
slide becomes an object of its own:

```ts
Presentation@0.2.0 { name?, description?, slides: Ref<Slide>[], theme? }
Slide@0.1.0 { content: Ref<Obj>, title?, hidden?, notes?: Ref<Text>, image?: Ref<MediaArtifact> }
```

- **Ownership** _(user)_: Presentation → Slide → owned `Text`. Removing a slide deletes the Slide and its own Text;
  a linked object is only unlinked.
- **Metadata** _(user)_: what applies to any content lives on the Slide (`hidden`, `notes`, `image`, `title`), so a
  linked object can be hidden or given an image; `layout` and `background` stay in markdown frontmatter, and an
  export writes the Slide fields back as frontmatter (`hide:`, `image:`, notes comment).
- **Image** _(user)_: a ref to a plugin-studio `MediaArtifact`, generated with `StudioOperation.Generate`; the slide
  background resolves the artifact to its image. `GenerateSlideImage(slide, prompt)` is the skill's slide tool; a
  markdown slide whose layout places no image switches to `layout: image`.
- **Assistant context** _(user)_: opening a slide opens its `Slide`, so the chat companion's subject is the Slide and
  `SkillsAnnotation` on the type enables the presenter skill; the skill reaches the content and the presentation
  from it.
- **Migration** _(agent call)_: `Presentation@0.1.0 → 0.2.0` wraps each section in a new `Slide` (its `Text` re-parented
  to the Slide) and lifts `hide: true` into `hidden`; creating the Slides needs the migration's `onMigration` hook,
  since `transform` only rewrites the object's own data.
- **Prototype** _(user)_: a story of the slide editor beside the assistant companion, with a mocked AI service whose
  scripted reply calls the real `GenerateSlideImage`, and a stub image provider; the play asserts `slide.image` is
  set and the preview shows the image.

## Phases

1. **Presentation type + runtime** — schema, create action, app-graph folder and children, "Add to presentation"
   picker (toggle off until Phase 4); `Deck`, `PresentationArticle`, `SlideFrame`; the preview companion keeps
   `RevealPlayer` until Phase 3; fullscreen toggle, toolbar and overlay pager (existing `Pager`), focus-scoped keys, view-state slide
   index; delete `PresenterContext`, `StartButton`, `Layout`, `CollectionArticle`, `presentCollections`. Reveal
   still renders markdown slides.
2. **`Pager` primitive** in `@dxos/react-ui`; presenter adopts it; `Carousel` styles and autocue `TakeStory`
   follow.
3. **Markdown renderer** for the Slidev subset (layouts, slots, clicks, notes) — **done**; reveal.js deleted (no
   setting); test decks converted; print stylesheet; embedded `<Surface>`s addressed by ECHO URI
   (`echo:///<id>`, or `echo://<space>/<id>` while that space is open) resolve through the slide's owning
   database and settle on a "Missing object" placeholder when malformed, missing or deleted.
   Known limit: `class:` frontmatter only takes Tailwind utilities that are already generated, since the
   markdown is not scanned; a safelist is a follow-up.
4. **Slide surfaces** for sheet, canvas, tldraw, outline; fallback chain; surface-lookup helper and picker
   filter.
5. **Assistant skill** + eval.
6. **Slide editor** — toolbar, split and companion preview, two-way cursor sync (§8).
7. **Later:** presenter view (notes, next slide, timer; single window first, second window once view state is
   confirmed to sync across windows).

Each phase updates `PLUGIN.mdl` (features, scenarios, QA, `## Changelog`) and ships with stories and tests.

## Decisions log

| #   | Question                     | Decision                                                                               | By   |
| --- | ---------------------------- | -------------------------------------------------------------------------------------- | ---- |
| Q1  | Dedicated deck object?       | `Presentation` type owning ordered sections (owned `Text` or links); navtree folder    | user |
| Q2  | Section → slides?            | One section = one slide                                                                | user |
| Q2b | Keep the document companion? | Yes, as a quick preview split on `---`                                                 | user |
| Q3  | No slide surface?            | Fallback `Slide` → `Section` → `CardContent` → title; picker toggle filters to `Slide` | user |
| Q4  | Slide index storage?         | `react-ui-attention` view state, `local` backend, per user per deck                    | user |
| Q5  | Pager vs Carousel?           | Separate `Pager`; Carousel shares styles                                               | user |
| Q6  | Skill trigger?               | Annotate `Presentation` only; `agentCanEnable`                                         | user |
| Q7  | Presenter view now?          | Later (Phase 6); notes parsed now                                                      | user |
| Q8  | Slide syntax?                | Strict Slidev-compatible subset, rendered by our own pipeline                          | user |
| Q9  | Slide editor preview?        | Split (editor above, slide below) and companion; no picture-in-picture                 | user |
| Q10 | Slide editor toolbar?        | Formatting, slide tools (layout, clicks, slots, objects, background, notes), view      | user |
| Q11 | Editor for markdown docs?    | No; Presentation slides only, slide tools may join plugin-markdown's toolbar later     | user |
| Q12 | Cursor sync?                 | Both ways: cursor reveals click steps; clicking the slide moves the cursor             | user |

## References

- `packages/plugins/plugin-presenter/PLUGIN.mdl` — current spec, with the attributed `## Changelog`.
- `packages/sdk/app-toolkit/src/ui/components/AppSurface/AppSurface.ts:379` — `AppSurface.Slide`.
- `packages/ui/react-ui/src/components/Carousel/Carousel.tsx` — Carousel.
- `packages/ui/react-ui-attention/src/types/ViewState.ts` — view-state aspects.
- `packages/plugins/plugin-markdown/src/skills/MarkdownSkill.ts` — skill pattern.
- Slidev https://sli.dev (syntax https://sli.dev/guide/syntax, layouts https://sli.dev/builtin/layouts) · Marp https://github.com/marp-team/marp-core · Quarto revealjs
  https://quarto.org/docs/presentations/revealjs/ · Presenterm https://github.com/mfontanini/presenterm ·
  hast-util-to-jsx-runtime https://github.com/syntax-tree/hast-util-to-jsx-runtime
