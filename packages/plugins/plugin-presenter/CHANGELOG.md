# @dxos/plugin-presenter

## 0.17.0

### Minor Changes

- 58b36b7: A canvas can open framed on a box of the drawing rather than on its own contents. `CanvasSettings` takes `fitFrame`
  and `fitZoom`, which `CanvasEditor.Root` threads through to the 2D host, so drawings that each fill a page differently
  open at ONE scale and read as one deck instead of nine drawings.

  `@dxos/plugin-presenter` exports `createPresenterStoryPlugin` from a `./testing` subpath, which stands in for
  plugin-deck's ephemeral state when a presentation is shown outside the deck.

- 9b2b0fe: A 2D canvas shown as a section, slide or card leaves the wheel and trackpad to the page until it has focus. A canvas exported or printed as SVG draws a container's label at its top-left corner rather than its centre.

  In a presented deck, left, right, `[` and `]` move between slides past any click steps, with the brackets landing on a slide fully built, up and down step through a slide's click steps, and Cmd or Ctrl with left or right jumps to the first or last slide. Up and down no longer jump to the deck's ends. In a Presentation's thumbnail grid, up and down move between rows and Space starts presenting from the current slide.

  Choosing a template in the Create Space dialog no longer scrolls the list, so the press lands on the row under the pointer. The chosen template keeps an orange outline, hover is easier to see, and the dialog's scrollbar sits at its edge. `Listbox.Root` gains `selectionStyle='outline'`.

  Theme settings gain a hue picker for the focus color.

  A `Card.Header`'s Block and icon-only Button stay beside the first line of a wrapping Title. The space Home scrollbar sits at the right edge of the plank.

- 92ef425: A link can name an action that runs on the object it opens, so a public link to a presentation opens already presenting. The URL carries the action as `?action=<name>`, its DXN without the `dxn:` prefix. Plugins contribute actions with `AppCapabilities.LinkAction`, each scoped to internal or public links and to the objects it applies to; `@dxos/app-toolkit/LinkAction` adds the action to a link (`withAction`), finds it (`find`) and strips it (`withoutAction`). The deck runs the action once the object is open, and the boot loader stays up until it has run, for 10 seconds at most.
- 17a9e75: `Listbox.Root` takes `tileWidth: { min, max }`: items lay out as tiles between those widths, as many columns as fit at `min`, measured before the first paint and reflowing as the container resizes instead of stretching to a debounced column count; the arrow keys move by the columns on screen. The presenter's slide grid uses it, with a small/large toggle and captions from each slide's title or first heading; presenting scales the slide in the frame its container changes and fades in fullscreen once its size settles, and the pager follows the light/dark theme. The assistant's agent picker shows each model's vendor logo.
- af8ed26: In the presentation grid, double-clicking a slide or adding one opens it in the slide editor. The add button is a split button whose caret sets the layout of later slides, and a ghost tile after the last slide adds one. A slide with `hide: true` in its frontmatter is skipped when presenting and shown dimmed in the grid. The toolbar presents with the editor's present icon, replacing the fullscreen button. The slide editor splits evenly until resized and has no fold gutter. A canvas drawing on a slide is read-only and shows no toolbar, palette or panels. `Canvas.Root` takes `transparent`, which draws no surface under the scene; a canvas on a slide uses it. In fullscreen, the space around a letterboxed slide takes the slide's background. The canvas background's context menu has a Back item inside a frame or an isolated composite. The app has one context menu: right-clicking an element marked with `AppNode.contextMenuProps(id)` opens that graph node's actions, as its navtree menu lists them; navtree rows and presentation grid tiles are marked, and hiding a slide is a graph action. A presentation's properties lay out its theme, colors and fonts in pairs, show the theme's default fonts when unset, and render an example slide in the story; each color is a text box with a picker at its end. `@dxos/react-ui` adds `ColorPicker` (Ark's color picker: a wheel tab and a swatch grid of the theme's hues by tone, with a reset), and `@dxos/react-ui-form` adds `ColorField` and fixes `Form.Layout` dropping the title of an annotated optional field. Presenter is tagged beta and on by default in Composer. The DXOS Architecture space template includes an ECHO presentation. `decorateMarkdown` takes `nodes`, to decorate only some syntax (the slide editor decorates fenced code); the fullscreen pager ends with an exit button and drops the `[ESC]` hint. Breaking: a presentation's slides are `Slide` objects (`Presentation@0.2.0`; a migration converts 0.1.0 presentations in place): each refs its content and holds its title, hidden flag, notes and a generated image, and a presentation gains a description. Opening a slide opens its `Slide`, so the assistant beside it has the slide as context, and the presenter skill's `GenerateSlideImage` tool generates an image through plugin-studio, stores it as a file through plugin-file (`FileOperation.CreateFromSource`), and places it in the slide's layout; plugin-studio exports `StudioHooks`, and slide images accept `blob:` URLs. plugin-studio is now public.
- 2d585c2: Add the `Presentation` type, an ordered deck of owned markdown slides and linked objects that the navtree shows as a reorderable folder; collection decks and the `./Settings` and `./PresenterCapabilities` exports of `@dxos/plugin-presenter` are removed. `@dxos/app-framework` exports `Surface.matchCandidates`, and `@dxos/app-toolkit` adds `AppAnnotation.ContainerAnnotation` (an object's node lists one of its ref arrays) and `ContainerModel.isRemovable`: members a container marked `deleteOwned` owns get no remove action and are deleted only with it.
- 0166448: Presentations render slides written in a Slidev markdown subset (layouts, click steps, video backgrounds, embedded object surfaces) and print the whole deck, one slide per page; reveal.js is removed. A Presentation's article is a grid of slide thumbnails that can be dragged to reorder and double-clicked to present. A deck takes a theme (`default`, `light`, `dark`, `serif`) with color overrides and a named text and code font, whose web fonts load only when used. Slides open in an editor with a slide toolbar and a live preview, below it or in the companion, kept in step with the cursor both ways.

  `Listbox` takes `tiles` (a column count) to lay items out as a grid of cards with two-dimensional arrow keys; a list's current row is now marked in a neutral color and its selection in the focus color, and draggable rows can be reordered in a grid (`useReorder` with `axis: 'horizontal'`). `SyntaxHighlighter` takes a `themeMode` prop and `react-ui-syntax-highlighter` exports `renderRows`.

- 0ebb028: A presentation's `theme` sub-object names its base theme `base` (breaking: was `name`, with no migration), its fields sit in one nested, collapsible Theme group in the presentation's properties, and its description is multi-line text. `@dxos/react-ui-form` hides a field whose `optional` wrapper is annotated `FormInputAnnotation.set(false)`, so the theme no longer shows twice, and a nested group's legend is a block-tall row so its disclosure clears the border.

  Sheets (`@dxos/plugin-sheet`) share one formatting toolbar between the sheet and each formatted range in its properties: alignment, wrap, and a highlight color from the theme's swatches (tones 100 to 900), with black text up to tone 500 and white beyond; the header style is no longer a toolbar toggle, and contributed actions such as comment sit at the toolbar's end. The properties' Formatting list shows each range with its toolbar; selecting a row selects its range in the sheet, and a row's formatting can move to the sheet's selection. A sheet on a slide (`role=slide`) shows only its used range, scaled down to fit and never past 1:1, with no status bar, and is inert. Sheets have a multi-line description, and the cell editor keeps a cell's text in place when editing starts. `@dxos/react-ui`'s `ColorPicker.Trigger` takes `views` to offer swatches or the wheel alone, and `@dxos/lit-grid` cells take a `background` and `foreground` color.

- b15e5c3: A grid's children name the tracks they cover as `colSpan`/`rowSpan`, as a table cell and CSS's `grid-column: span n` do; `cols`/`rows` now only ever mean the tracks a `<Grid>` lays down, so a count of tracks laid down never reads the same as a count of tracks covered.

  Card art is cut to the card. `gen-card-art.mjs` writes one crop per mark per card width into `backgrounds/cards/`: each is the same height and centred on the mark, so a card spanning two columns fills its width without drawing its mark larger than its neighbours' — which `object-fit` cannot do, since it takes its scale from the box. The rays are run past the frame first, so the wider crop has no bare edge.

  The brand's `icons/{white,black}` marks carry their own size instead of `width="100%"`, which left them with no intrinsic size and collapsed them to nothing wherever they were drawn as an `<img>`.

  `<Box variant="hero">` draws a lone image at a title slide's scale and `<Box variant="watermark">` runs one oversized off the slide's start edge behind the words. Five cover stories draw the brand's own lockup with them, so a title slide sets the name in the brand face rather than as a heading.

- b15e5c3: The deck's title-slide artwork is a brand asset: `bg-dxos-glow.svg` is that slide exported from Figma as SVG, with its text dropped and a fractal-noise grain laid over it so the long dark ramp of its glow stops banding at 8 bits.

  `<Box variant="title">` and `<Box variant="caption">` carry a title slide's two blocks — the name with the deck's links under it, and the brand lockup with the small print at the foot — on one start edge, at the measurements of the Figma slide they reproduce. The sixth cover story draws that slide, with the artwork as its background.

- fdea6da: The `display` slide font now loads Poiret One instead of naming a face nothing fetched, so a deck set in it showed the fallback sans on every machine that did not happen to have the font installed.

  `<Box variant="lockup">` draws a brand mark where a heading would go, at a heading's scale. `<Box variant="fill">` draws its picture to the column's height and lets it run past the column's sides, so the slide crops it rather than the column: art cut at a column's edge ends in mid-air, which `bg-dxos.svg` makes plain since its drawing stops short of its own frame. It stays in the flow, so the words beside it are laid out as though it were not there and still paint over it.

  Every heading the slide theme styles takes `text-balance`, so a heading that wraps breaks into even lines instead of leaving one word alone.

- e6fa2fa: Two box styles for a title slide's artwork. `<Box variant="spread">` fills the slide and pushes its blocks to the top and bottom edges, which leaves the middle to whatever is behind them. `<Box variant="fill">` gives a picture a column of its own: it grows to the column's height and is cropped to its width, so a mark at the art's centre stays centred however narrow the column is — with `bleed`, the art runs to the slide's own edges.

  `<Box variant="watermark">` is removed; the column is the same idea without an oversized mark behind the words.

  A centred slide spaces its blocks to be read apart: a mark, a name and a date no longer sit one line from each other. A two-column slide centres each column in its half, so a column reads as its own block rather than hanging from the top.

- b15e5c3: Slide markdown takes a `flow` list variant, which lays its items out as a row of cards with an arrow in each gap, for a progression. The item's own markdown names its parts — emphasis is the label beside the counter, strong is the title, the rest is the body — and `<List variant="flow" active="3">` marks the item the story has reached. It composes with `<v-clicks>`: a build reveals the cards one at a time, each holding its place in the row, and an arrow waits for the card it points at.
- b15e5c3: Slide markdown lays a slide out in tracks with three layout tags. `<Grid cols="4" rows="2">` lays down even tracks, `<Cell>` and `<Card>` span them with `colSpan`/`rowSpan` of their own, and `<Card>` fills one with an image, a title and a line or two of markdown — `default` on the slide's own panel, `outline` in its accent, or `plain` with no surface at all. A variant's parts are now named by the tag they land on, so a variant styles any tag it holds rather than only the handful the list and table styles needed.
- 38b815b: Slide markdown takes three style tags: `<List variant="cards|steps|outline">`, `<Table variant="rows|cards|outline">` and `<Box variant="card|outline">`. `List` and `Table` style the block they wrap rather than adding an element, so the content stays a plain markdown list or GFM table while the slide theme paints it; `Box` is the generic container and wraps whatever it holds. Variants are defined in one place in the slide theme, keyed by the part each class lands on, and their classes read the theme's `--slide-*` variables, so colors are overridden rather than hard-coded: a deck's theme settings now also carry `code` and `separator`, a slide overrides any of `accent`, `foreground`, `code` and `separator` in its own frontmatter, and a `tone` on one tag (`accent`, `info`, `success`, `warning`, `error`, `neutral`) repaints that block alone. Markdown supplies no CSS — every variant, tone and color is validated, and an invalid one falls back and is reported as a slide issue.
- 4514d15: The slide editor's preview is one toggle: the toolbar button shows or hides the rendered slide below the markdown, and the preview pane carries a close control that does the same thing. The separate "preview in the companion" button is gone, and with it the mode it selected. The preview is the editor's own pane, so the control no longer touches the plank's companion at all — it neither opens one nor closes one another tool put there.
- 0ad95b7: A slide DSL tag is editable in the slide editor. Tags that carried no attributes were atomic — the caret stepped over `<Box>` or `<v-clicks>` whole — which left no position at which to type the attribute that gives them their behaviour. Only `::slot::` markers stay atomic; a marker is a position and has nothing inside it to edit.

  A slide chooses how its background picture meets it. `backgroundFit: contain` draws the whole picture rather than cropping whatever does not fit the slide's 16:9; `backgroundColor:` is the ground under it — what shows where a contained picture does not reach, through a transparent one, or on its own as the slide's background; and `backgroundBlend:` says how the two are composited. `screen` is the useful one, because artwork exported from a design tool carries its own backdrop and paints over anything beneath it: it composites that backdrop away, so the glow lands on the slide's color instead and a picture drawn on black is unchanged. All three are per-slide; a deck-wide background still belongs in the deck's theme.

  A slide names its scrim: `scrim:` paints what is outside the slide — the inset void in the editor and the letterbox bands when presenting. The scrim belongs to the canvas, which the slide's own theme variables never reach, so the slide publishes the color up to it. Its default is now the theme's slide background everywhere; the editor's void used to take the deck surface instead, which read as a lighter frame around the slide. A deck sets one for every slide through the theme's new _Scrim color_.

  The slide editor completes frontmatter keys, not just `layout:` values. Typing on a blank line in the block offers every key the slide takes, leaving out the ones already written, and a key whose values are a fixed set (`layout`, `theme`, `bleed`, `hide`, `backgroundFit`, `backgroundBlend`) offers those after the colon.

  The slide editor's toolbar carries the deck's own actions: the gallery the slide came from, and a button that adds a slide after the one being edited — the gallery's own button still adds one last, since there is no current slide there. Adding a slide was the gallery article's alone, as an inlined plus beside a layout caret; it is now one `AddSlideButton` both toolbars use, a joined run (`Button.Group compact`) whose caret is half a control wide so the pair reads as one control rather than two buttons.

  The completion list stops at its ends rather than wrapping. The list is short and ordered, so coming round again reads as the selection jumping rather than as having run out. The keymap has to sit before `autocompletion`, which registers its own at the same (highest) precedence: at equal precedence the handler registered first is asked first.

  The editor's preview no longer jumps as it moves between slides. The canvas scales itself to whatever it measures, and the preview is remounted inside a splitter on every slide, so its first measurement caught a height the container did not keep — one frame at the wrong scale, which read as the title jumping. Measured in the app: the slide painted 356px tall, then 316px a frame later. The first measurement now waits for the frame after layout; every one after it stays immediate, so resizing the grid or entering fullscreen is unchanged.

  A slide and its text carry their type's name. A type is named by a translation block keyed by its typename, which `Presentation` had and `Slide` did not, so a slide with no title showed as `org.dxos.type.slide` wherever the label fell back to the type — the navtree and the debug tree among them. `Text` is named here too: it is an SDK type with no plugin of its own, so nothing named it at all.

  `SlideGrid` is `SlideGallery`, since it is the panel of slide thumbnails rather than anything to do with the `<Grid>` tag or the `slide-grid` element that tag renders, both of which keep their names.

- f86f10e: Presenter shows speaker notes while presenting (subtitles or a separate window, chosen in its settings), gives each slide an optional desired length, and adds extension points for other plugins: a toolbar slot, an overlay slot and a presentation event handler. Studio renders `audio/*` variants. Adds the private `plugin-recorder`, which records a presentation's voice-over. react-ui adds a `SystemButton.Check` toggle preset (green while checked).
- 120e49f: The slide dialect and its renderer are a package of their own, `@dxos/react-ui-slides`: the markdown dialect (its frontmatter, its layouts and the `<Grid>`/`<Card>`/`<List>`/`<Box>` tags), the renderer, the theme, the 16:9 canvas, and the CodeMirror extensions that highlight and complete it. An embedded object stays the host's business — the renderer takes a `renderSurface` callback and knows nothing about Surfaces or refs — so a docs page, an export path or anything else can show a slide without a database.

  What stays in `@dxos/plugin-presenter` is the presentation: `Slide.Root` and `Slide.Content` resolving refs, the deck, the gallery, the toolbars, and the plugin's own capabilities and operations. The line is what a second consumer would need rather than what happens to compile, so the deck chrome stays even though it carries no ECHO either.

  Consumers of `@dxos/plugin-presenter/SlideTheme` take `@dxos/react-ui-slides` instead; the plugin's `#markdown` subpath is gone.

  The package publishes publicly, bootstrapped on npm with `publish-all.yml` as its trusted publisher, so a consumer outside this repo can depend on it.

- 296c44c: Sheet charts gain a timeline type that plots a range with one event per row (date, category, title, description, image URL) along a vertical spine. Categories can nest by path (`Tech/AI`) and show as toggle tags grouped under their parent, in a chosen order and colors; the timeline offers a left, center or right spine, log, linear or compact spacing (animated when switched), optional dates in labels, labels sized to fit, a text filter, click and arrow-key selection, and a card with each event's description and image. `@dxos/react-ui-plot` exports the `Timeline` component, `TimelineOptions`, and helpers for reading and arranging events.

  Charts are now their own ECHO objects (`org.dxos.type.chart`), owned by their sheet and pointing back to it, so a document can embed a chart as a section or slide; the sheet (`org.dxos.type.sheet` 0.2.0) holds refs to them, and a migration turns 0.1.0 sheets' inline charts into chart objects. `Sheet.addChart`, `Sheet.updateChart` and `Sheet.removeChart` manage them.

  plugin-sheet contributes a "Sales" space template (a small sales sheet with a bar chart and a pie chart) and `SheetUtil.cellsFromRows`, which turns rows of values into A1 cells.

  Presented markdown decks render embedded objects (`![label](echo:…)`) through their slide surface instead of as broken images, and a sheet's grid spans all its rows and columns rather than the first 50 rows.

  The timeline reads deep time (`13.8 Gya`, `66 Mya`, `300 kya`) and labels negative years as BCE, ticking spans longer than ten thousand years in years ago; `@dxos/react-ui-plot/testing` now holds a history of the universe. Presented decks keep slides at the top rather than centering them.

- 259e674: A deck's theme can color its headings apart from the accent: `heading` for the first level and `subheading` for the second and third, each falling back to the accent when unset. The presentation's theme form shows both.
- 9f2cacf: A spec's text is the only store for its blocks. plugin-projects draws each block of a kind its dialects define as a form over that kind's schema, offers a slash command per kind, and reads and writes blocks with `ProjectOperation.GetSpecBlocks`, `SetSpecBlock` and `DeleteSpecBlock`. The Specs tab's spec picker nests a spec beneath the specs whose `Ref<spec>` fields cite it. In plugin-code a feature is a `feat` block: the board and the feature companion read the blocks through `ProjectHooks.useSpecBlocks`, and tasks and showcases name a feature by its block key through `SpecItem.Implements` and `Showcase.Demonstrates` with `item`. A migration folds existing feature objects into their specs' text.

  The Specs tab has one toolbar, and every Markdown editor's toolbar groups its tools into Format and Insert, which show their buttons while there is room and fold into menus before anything moves into ⋮. A guided tour step opens the folded group that holds its control. Shared form and picker parts gained what the block forms use: inline labels, header grids, typed array rows, lookups of several values, option details and hues.

  Breaking:

  - plugin-code's feature operations (`CreateFeature`, `UpdateFeature`, `DeleteFeature`, `AddFeatureDependency`, `RemoveFeatureDependency`, `LinkFeatureTask`, `GetFeatures`, `ImportSpecFeatures`, `ExportSpecFeatures`, `ImportFeatureLinks`) are removed. Use the block operations, `CodeOperation.CreateSpec` with `breaks`, `UpdateSpec`, `LinkTask` and `CreateShowcase` with `items`.
  - The feature embeds, `/feature`, the feature article and the spec codec are removed; a spec syncs with its file as text.
  - `@feature` code links are no longer stored on features.
  - A read-only Boolean form field is no longer dimmed, and a `Select` shown as a tag is filled in its option's hue.

- e1d537b: `ActionToolbar` lays out start and end zones and multiple rows, and ends with an overflow menu (⋮) that takes collapsible groups as submenus while a row is too narrow. Items and groups say where they go with `placement` (`ToolbarPlacement` on `MenuItemChrome`). A plain named group renders inline in a toolbar and as a submenu in a menu; another component extends it with `MenuBuilder.extend(groupId, …)`, including the overflow menu (`TOOLBAR_OVERFLOW_ID`). `EditorToolbar` declares an insert group (`EDITOR_TOOLBAR_INSERT_GROUP`) and an overflow menu for consumers to extend. `Editor.ToolbarMenu` renders the same actions as a menu; in a menu the overflow group's items follow the others instead of nesting.

  Breaking: `ActionToolbar` no longer takes `children` or `start`. Add hand-written controls as `custom` items (`MenuBuilder.custom`) and labels as `text` items (`MenuBuilder.text`); another component extends a toolbar through `customActions`, now a prop of `ActionToolbar` itself.

  Presenter slides gain two layouts, `three-cols` (`::middle::`, `::right::`) and `two-by-two` (`::right::`, `::bottom-left::`, `::bottom-right::`); "Start next column" inserts the marker of the column after the cursor's.

### Patch Changes

- 0ad95b7: The brand assets carry one set per mark, under one name. `icons/<mark>.svg` is the themeable shape the `dx--` sprite is built from, `icons/{black,white}/<mark>.svg` are the colour-locked copies an `<img>` or a packaged sprite needs, `backgrounds/<mark>-{center,left,right}.svg` place it, and `backgrounds/cards/<mark>-{1,2}x.svg` crop it to a card. The `icon-` and `bg-` prefixes are gone — the folder already says which it is.

  The two renamed marks take their current names: KUBE is EDGE and DXNS is SAGE, in the asset names and in the `EDGE` and `SAGE` icon components. `PLEX` and `TILE` icon components are added, so all eight marks have one; DXOS joins the others as `backgrounds/dxos-center.svg` and gains its card crops. `logotypes/dxos-horizontal-block.svg` was a typo for `black`.

- 99708bd: In the slide editor, slot markers such as `::right::` and click tags without attributes are atomic: the caret steps over them and a delete removes them whole. Two layouts are added: `three-cols` (`::middle::`, `::right::`) and `two-by-two` (`::right::`, `::bottom-left::`, `::bottom-right::`); "Start the next column" inserts the marker after the one at the caret. Typing a `layout:` value in the frontmatter offers the matching layouts with their names, in two columns. The slide toolbar's layout picker is an icon button, and every layout has a translated name in the picker. In fullscreen, the overlay pager stays visible while the pointer is on it. Text fonts include Space Grotesk, Mali, Geist, Orbitron, Unbounded, OpenDyslexic and LXGW WenKai (Chinese), loaded on demand and kept out of the web app's install-time cache. Frontmatter `bleed: left` or `bleed: right` takes a column slide's outer column to the slide's edges, so an embedded object can fill it. An assistant skill, `PresenterSkill` (enabled on Presentations), creates presentations from Slidev markdown slides, adds or links sections, lists the layouts and frontmatter keys, and presents a deck. Code blocks are padded, and a fence's `{lines:true}` option numbers their lines. The deck and slide components are now composites, `Deck.*` and `Slide.*`, with a headless `Root`.
- b15e5c3: Each suite background now ships in its own mark's colour. Five of the seven carried another topic's — ECHO's art was TILE's red — which is why every consumer rewrote the `color` attribute before drawing them; only the two redrawn most recently were right. The presenter's layout story reads them from `assets.dxos.org/brand/backgrounds`, which mirrors this package, rather than inlining them as data URIs, so a redrawn mark reaches the slide without a code change and the story's markdown stays legible.
- 6a61a88: While presenting, Right moves to the next slide with all its click steps showing, as Left already does for the previous slide; Up, Down and Space still step through a slide's builds. Changing slides no longer flashes the screen dark for a frame.
- 3d22d48: You can follow a peer around a space. Follow sits next to Jump and Go to on a peer's row and follows whichever of their sessions moved last; with the sessions toggle on, each session row has a Follow that stays on that session. While you follow, your deck shows theirs: the same planks in their order, scrolled to the plank at the front of theirs, with each plank keeping their top line at the top and the companions they have open. With no planks reported, it opens the object they attend, at the path they opened it from. None of it moves your caret or focus, and they send their location every 100 ms instead of every second. A plank your deck has no URL binding for (a type from a plugin you lack) is left out, and your deck scrolls to the nearest plank of theirs it holds instead. Scrolling, clicking or typing in a plank, attending an object outside what you show of them, going back or forward in history, or pressing Escape stops it, and so does the leader being gone from the space for five seconds. A follow pauses while you cannot open what they attend and picks up again once you can. The Members tab shows a dot while you follow, and the leader's row sits first in its list with Stop. A `Locator` reveal takes `follow` to scroll without moving the caret and answers whether it revealed the anchor, so a follower whose editor mounts late still lands on the leader's line, a deck companion's `badge` atom can hold `true` to draw a dot, and `LayoutOperation.Set` takes `focus: false` to focus no plank and a `workspace` to set the planks in, as `Open` does. View state can now be followed: a `ViewState` aspect declared with `follow: 'write'` has its values for the space and each open object sent with presence, and a follower writes the leader's into its own view state; one declared `follow: 'reveal'` is sent for the follow to apply. The deck reports its front plank as the space's `ViewLocation` and its open companions as `AppCapabilities.Companions`, and the follow applies them with `LayoutOperation.ScrollIntoView` and `UpdateCompanion`. A project's view state is followed, so a follower sees the leader's tab, spec and chart; so is a presentation's slide, and a drawing's camera in tldraw, excalidraw and the 2D canvas, which a drawing variant takes as `camera` and reports with `onCameraChange`. The 2D canvas editor applies a host camera that changes while it is open. A project's view state is now keyed by its EID, so the tab each project last showed resets once. `GraphPath.getEidFromPath` names the object a graph path points at. A schema form's boolean field carries its JSON path as `data-testid`, as text fields do. Leading shows too, in amber on every screen: the Members tab's dot appears on both sides, a follower's leader row rises to the top of Members and carries Stop, and a leader sees its followers under "Following you". Every plank heading, companions included, washes in amber over a one-pixel underline while you follow or are followed, through a new `AppCapabilities.LayoutAccent` the deck applies, and those people's avatars ring in amber. A deck companion takes a `badgeHue` for its rail dot.
- Updated dependencies [b6d1c9c]
- Updated dependencies [9314c91]
- Updated dependencies [90a7f6e]
- Updated dependencies [2ffc301]
- Updated dependencies [c1f845f]
- Updated dependencies [9cb96c7]
- Updated dependencies [caa28b3]
- Updated dependencies [812ae94]
- Updated dependencies [cb058b9]
- Updated dependencies [73ed632]
- Updated dependencies [710da43]
- Updated dependencies [cab57d0]
- Updated dependencies [df16fba]
- Updated dependencies [e8029c3]
- Updated dependencies [81d2cd2]
- Updated dependencies [f142d06]
- Updated dependencies [2fb32b9]
- Updated dependencies [d8b13ad]
- Updated dependencies [1924a44]
- Updated dependencies [1ac444f]
- Updated dependencies [cfc5c42]
- Updated dependencies [b97d8ea]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [af82eb1]
- Updated dependencies [4514d15]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [21a8ea6]
- Updated dependencies [6a37f4b]
- Updated dependencies [d45bf58]
- Updated dependencies [f82b258]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [f7e965a]
- Updated dependencies [2f78880]
- Updated dependencies [9bcc167]
- Updated dependencies [b3a41d3]
- Updated dependencies [0737c44]
- Updated dependencies [9d30049]
- Updated dependencies [908c301]
- Updated dependencies [d95ffc3]
- Updated dependencies [78e96da]
- Updated dependencies [f37ae92]
- Updated dependencies [416201f]
- Updated dependencies [3aef671]
- Updated dependencies [13bc40d]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [2176f79]
- Updated dependencies [38ebf5e]
- Updated dependencies [9d66bcd]
- Updated dependencies [22f759a]
- Updated dependencies [49df146]
- Updated dependencies [a18cb35]
- Updated dependencies [9471682]
- Updated dependencies [074e3e6]
- Updated dependencies [92ef425]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [09d8716]
- Updated dependencies [a843e27]
- Updated dependencies [27b3290]
- Updated dependencies [d619a65]
- Updated dependencies [0a634be]
- Updated dependencies [45e1c93]
- Updated dependencies [0a4580c]
- Updated dependencies [1d30e41]
- Updated dependencies [03ee407]
- Updated dependencies [6fd1079]
- Updated dependencies [2d585c2]
- Updated dependencies [0166448]
- Updated dependencies [392bed0]
- Updated dependencies [34643a3]
- Updated dependencies [f86f10e]
- Updated dependencies [c9c3867]
- Updated dependencies [80818bc]
- Updated dependencies [aedf119]
- Updated dependencies [8554a26]
- Updated dependencies [80c25fe]
- Updated dependencies [20a14b9]
- Updated dependencies [5970ed3]
- Updated dependencies [b8cc7e7]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [1a06754]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [0ad95b7]
- Updated dependencies [120e49f]
- Updated dependencies [f071de2]
- Updated dependencies [f175a2d]
- Updated dependencies [a9793bf]
- Updated dependencies [9c5af4a]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [8d7d5e1]
- Updated dependencies [4be51c3]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [fba77f7]
- Updated dependencies [02254b0]
- Updated dependencies [bf1dc0c]
- Updated dependencies [120dc6c]
- Updated dependencies [89ad65c]
- Updated dependencies [259e674]
- Updated dependencies [4514d15]
- Updated dependencies [b8e76f9]
- Updated dependencies [3d22d48]
- Updated dependencies [7e07e49]
- Updated dependencies [6cd526c]
- Updated dependencies [b159f41]
- Updated dependencies [97de470]
- Updated dependencies [3b37cd1]
- Updated dependencies [bdb73fb]
- Updated dependencies [39f6b21]
- Updated dependencies [a8e68c5]
- Updated dependencies [9f2cacf]
- Updated dependencies [9864a15]
- Updated dependencies [101f620]
- Updated dependencies [8a66e4e]
- Updated dependencies [8e2f718]
- Updated dependencies [d00cc85]
- Updated dependencies [0a14251]
- Updated dependencies [768db81]
- Updated dependencies [10b3963]
- Updated dependencies [e7ca5d7]
- Updated dependencies [e1d537b]
- Updated dependencies [1a0fff1]
- Updated dependencies [901c1e4]
- Updated dependencies [c1c6cf4]
- Updated dependencies [6f27147]
- Updated dependencies [e67aa80]
- Updated dependencies [df65316]
  - @dxos/plugin-markdown@0.17.0
  - @dxos/app-toolkit@0.17.0
  - @dxos/echo@0.17.0
  - @dxos/plugin-space@0.17.0
  - @dxos/app-graph@0.17.0
  - @dxos/plugin-deck@0.17.0
  - @dxos/react-ui-attention@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/compute@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/app-framework@0.17.0
  - @dxos/react-ui-editor@0.17.0
  - @dxos/react-ui-form@0.17.0
  - @dxos/plugin-code@0.17.0
  - @dxos/plugin-client@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/plugin-file@0.17.0
  - @dxos/react-ui-syntax-highlighter@0.17.0
  - @dxos/react-ui-list@0.17.0
  - @dxos/plugin-studio@0.17.0
  - @dxos/util@0.17.0
  - @dxos/react-ui-slides@0.17.0
  - @dxos/react-ui-menu@0.17.0
  - @dxos/echo-doc@0.17.0
  - @dxos/echo-react@0.17.0
  - @dxos/schema@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/log@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/errors@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/plugin-deck@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/plugin-markdown@0.16.0
  - @dxos/app-framework@0.16.0
  - @dxos/app-graph@0.16.0
  - @dxos/app-toolkit@0.16.0
  - @dxos/react-ui-attention@0.16.0
  - @dxos/compute@0.16.0
  - @dxos/echo-react@0.16.0
  - @dxos/ui-editor@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/random@0.16.0
  - @dxos/util@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui-theme@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3b03db7]
- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [1f72729]
- Updated dependencies [94ec06d]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [b82150a]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [417247b]
- Updated dependencies [1bc475e]
- Updated dependencies [d250ed2]
- Updated dependencies [55bdf55]
- Updated dependencies [9b9a4ca]
- Updated dependencies [098a536]
- Updated dependencies [25af912]
- Updated dependencies [7b47951]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
- Updated dependencies [2b6a93a]
  - @dxos/ui-editor@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/plugin-deck@0.15.0
  - @dxos/compute@0.15.0
  - @dxos/app-framework@0.15.0
  - @dxos/plugin-markdown@0.15.0
  - @dxos/app-toolkit@0.15.0
  - @dxos/echo-react@0.15.0
  - @dxos/app-graph@0.15.0
  - @dxos/react-ui-attention@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/util@0.15.0
  - @dxos/random@0.15.0
  - @dxos/ui-theme@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [0715304]
- Updated dependencies [085dcb1]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [ec6da5a]
- Updated dependencies [a1e64db]
- Updated dependencies [28bb45b]
- Updated dependencies [1eed6b1]
- Updated dependencies [6847fe2]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [27b542c]
- Updated dependencies [5324de6]
- Updated dependencies [b07f49f]
  - @dxos/app-framework@0.14.0
  - @dxos/plugin-markdown@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/compute@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/plugin-deck@0.14.0
  - @dxos/app-toolkit@0.14.0
  - @dxos/app-graph@0.14.0
  - @dxos/react-ui-attention@0.14.0
  - @dxos/echo-react@0.14.0
  - @dxos/ui-editor@0.14.0
  - @dxos/random@0.14.0
  - @dxos/util@0.14.0
  - @dxos/react-hooks@0.14.0

## 0.13.0

### Patch Changes

- 5e16828: Arrow keys move between slides again in a fullscreen presentation. The presentation now takes focus when it opens, so the deck's plank navigation and landmark focus traversal no longer swallow Left and Right.
- Updated dependencies [bbe9f18]
- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [bb2b672]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [32f32a0]
- Updated dependencies [66727e3]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [9833b46]
- Updated dependencies [5e95c71]
- Updated dependencies [68dc875]
- Updated dependencies [2e96a73]
- Updated dependencies [ab1bddf]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [69a4a85]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [161f994]
- Updated dependencies [ff92c50]
- Updated dependencies [3e73e53]
- Updated dependencies [7a177b9]
- Updated dependencies [9ab98cd]
- Updated dependencies [8fc641a]
- Updated dependencies [38e2ddb]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [596728d]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [3d05b7f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [6ea9d4d]
- Updated dependencies [dde8f43]
- Updated dependencies [4f8e566]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
- Updated dependencies [8412f8b]
  - @dxos/compute@0.13.0
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/util@0.13.0
  - @dxos/plugin-markdown@0.13.0
  - @dxos/plugin-deck@0.13.0
  - @dxos/ui-editor@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/react-ui-attention@0.13.0
  - @dxos/app-graph@0.13.0
  - @dxos/echo-react@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/random@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/ui-theme@0.13.0

## 0.12.0

### Patch Changes

- 41c90fd: Pressing Escape in the presenter companion no longer blanks the slides; Escape only exits fullscreen presentations. Fullscreen slides stay centered in windows wider than 16:9 in WebKit (the native app), where they previously overflowed the bottom of the screen.
- 2f5705f: Presenting a Markdown document now follows edits to it, keeping the presenter on the same slide and fragment, and the slides scale to fit when the companion or window is resized. Presenting fullscreen works again: it no longer rewrites the URL or blanks the screen, and it hides the companion tab strip. Narrow decks scale like wide ones instead of switching to Reveal's scroll view.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [12461e1]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [f4e481a]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [f82c78f]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [63fc847]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [28ad891]
- Updated dependencies [b8762ef]
- Updated dependencies [3aa3d63]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [d17d75a]
- Updated dependencies [557e243]
- Updated dependencies [b4a84e6]
- Updated dependencies [ea11703]
- Updated dependencies [cff33b7]
- Updated dependencies [5305365]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [9a36b1e]
- Updated dependencies [34f7d92]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [b63506b]
- Updated dependencies [dd17e57]
- Updated dependencies [bb22f38]
- Updated dependencies [513cac6]
- Updated dependencies [6d28380]
- Updated dependencies [57d460a]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [318d610]
- Updated dependencies [ab56cfe]
- Updated dependencies [1aabb03]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [362fd0f]
- Updated dependencies [dbff1e4]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [497caab]
- Updated dependencies [35d6e86]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [6c25ed3]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [4c55b5d]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [5b99c47]
- Updated dependencies [181f374]
- Updated dependencies [548e82c]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [4e4c25d]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [3294b3d]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [5913020]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [043c792]
- Updated dependencies [4aa6a33]
- Updated dependencies [9636ce1]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [efdcf61]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [a04ab6e]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [770c73d]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [ec4f4ca]
- Updated dependencies [d1a69fb]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [d308bf8]
- Updated dependencies [07514c2]
- Updated dependencies [1b6e258]
- Updated dependencies [93c7523]
- Updated dependencies [4a71ef2]
- Updated dependencies [987f7e1]
- Updated dependencies [e7fc023]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [f3c02b3]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [22c7a70]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [61becad]
- Updated dependencies [690dcaa]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [0280a6a]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [7263241]
- Updated dependencies [6fed038]
- Updated dependencies [0a27bde]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [178a283]
- Updated dependencies [886453b]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [e3d7a8c]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [8bf4620]
- Updated dependencies [631df48]
- Updated dependencies [d205e96]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [85bdad2]
- Updated dependencies [b2a44d6]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/plugin-markdown@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/plugin-deck@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/util@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/random@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-deck@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-markdown@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [e0e1a9f]
- Updated dependencies [31fe0b8]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [eec72c5]
- Updated dependencies [bce1dbc]
- Updated dependencies [e7f0d9e]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [ebb6383]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [77fff35]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [c58ebb7]
- Updated dependencies [d547045]
- Updated dependencies [b602d44]
- Updated dependencies [6439417]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [1dad41e]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [bda1a02]
- Updated dependencies [59a65a8]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [cec59a4]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [5585ec8]
- Updated dependencies [31fe0b8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/plugin-markdown@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/plugin-deck@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/effect@0.11.0
