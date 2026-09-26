# @dxos/ui-theme

## 0.12.0

### Minor Changes

- e680b16: Add `dx-shrink`, and remove the `min-*-0` that a clip had already applied.

  `min-h-0` is widely read as "makes things scroll". It does not: it says the element may be **shorter than its content**, and without it a flex/grid item's minimum height is its content height, so it shoves its siblings out of the line. Measured in a 260px column above a 40px footer, the footer lands at 927px — outside the box — with nothing scrolling anywhere. Scrolling is only the consequence of finally being squeezed.

  `dx-shrink` (`min-h-0 min-w-0`) names that intent, and `dx-grow` becomes `flex-1 dx-shrink` so the two decisions — may I be small, do I claim the rest — compose rather than hiding inside one bundle.

  Also deletes 27 `min-*-0` that never did anything: a scroll container has already zeroed the same minimum, so a `min-h-0` beside `overflow-hidden`, `-auto` or `-scroll` is dead weight that reads as load-bearing. `overflow-clip` is excluded — it clips without scrolling, so the minimum still applies there. `prefer-sizing-utilities` now reports the redundant ones, and flags `dx-grow dx-fill` as the long spelling of `dx-expand`.

- a805212: Split the sizing utilities and remove `dx-container`.

  `dx-expander` is renamed `dx-expand` and decomposes into `dx-fill` (`h-full w-full`) and `dx-grow` (`flex-1 min-h-0 min-w-0`), so a class names how the parent sizes the element rather than bundling five properties. `dx-container` is removed: its `overflow-hidden` duplicated the `min-*-0` it already carried — any non-visible overflow zeroes a flex/grid item's automatic minimum size — and clipped everything as a side effect. Call sites that genuinely clip now say `overflow-hidden` explicitly. `dx-fullscreen` loses its `overflow-hidden` for the same reason.

  `withColumn.propagate()` selected on `.dx-container` to keep a ScrollArea's scrollbar in the gutter; that marker is now an explicit `dx-scroll-boundary` on `ScrollArea.Root`.

  Adds a `prefer-sizing-utilities` lint rule for the hand-rolled equivalents.

- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

### Patch Changes

- 6a457ac: `@tailwindcss/postcss` and `@tailwindcss/vite` now resolve to the same Tailwind version. Both are direct dependencies and Tailwind ships them in lockstep, so the previous caret ranges let them drift apart.
- 2d58ea5: `ThemePlugin` no longer fails every rebuild under Vite's full-bundle dev mode (`vite dev --experimentalBundle`), where Rolldown's `hotUpdate` call carries neither the `server` field nor an `environment` the hook needs. Both its own hook and `@tailwindcss/vite`'s stand down there; a newly used utility class still needs a server restart in that mode.
- 6af89f4: Clicking the active space on the rail now slides the navigation sidebar instead of snapping it, and opening a companion shows the pane at once rather than after its URL resolves. Sidebar and layout slides run faster: 150 ms with an ease-out curve instead of 200 ms ease-in-out.
- 7ec1738: A dialog's scrim no longer swallows clicks once the dialog is closed. The presence machine unmounts it on `animationend`, which does not always arrive, leaving an invisible closed backdrop over the page and making everything behind it unclickable.
- df295b2: Stop the dialog and the app behind it flickering while a view transition runs. The app's dialog overlay now carries a `view-transition-name`, so the content group no longer paints over it and hides it for the length of every transition; the dialog's presentation is held as one value while it exits, so a closing dialog no longer loses its content, alignment and overlay styling while it is still on screen; and an open that crosses workspaces animates the chrome swap rather than hard-cutting to an empty deck.
- 818a096: Inline object embeds in markdown documents are focus-gated: an embed is inert until clicked, so the wheel scrolls the document rather than the sketch or embedded document; once attended it takes input, shows a subtle focus border, keeps keys and scroll chaining inside, and returns focus to the editor on Escape. Document cards fade their snippet into the card on any surface. Theme ring tokens (`ring-focus-line`, `ring-offset-focus-offset`) survive `mx()` beside a ring colour. Scenes (`@dxos/plugin-spacetime`) render a card preview in object grids, remember their camera pose per scene, always save a selected object's colour change, and orbit with half the inertia. Mermaid diagrams (`@dxos/plugin-mermaid`) and tldraw canvases (`@dxos/plugin-tldraw`) follow the app's colour mode and design-system tokens; `mermaid()` accepts `theme`/`themeVariables`/`themeCSS`. Deleting a single card from a type view (`@dxos/plugin-space`) is undoable.
- 08cddf6: Clicking a document in the navigation tree moves attention to the plank it opens, while focus stays on the tree row so the arrow keys keep working. Before this, attention stayed on the document you left. Opening a document within a workspace now crossfades in 50ms instead of 200ms.
- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- 6a1ec57: Add `Task.attachments`, files a task owns, with `Task.addAttachment`/`Task.removeAttachment` recording each change in the task's history, and the `tasks.addAttachment`/`tasks.removeAttachment` operations. Where plugin-file is installed, files dropped or pasted onto a task's article are stored and attached, with a placeholder card while each uploads and "Remove attachment" in the card's menu.

  `CardMasonry` (plugin-space) is now exported from `@dxos/plugin-space/components`, and `AppSurface.CardMasonryData` gains `size: 'compact'` (cards at three quarters, so a companion fits two columns), `inline` (in the host's flow rather than its own scroller), `pending` placeholder cards, and `CardMenu`, through which a host adds items to each card's menu. The `cardMasonry` surface now activates when requested on its own. A task's attachments and artifacts render through it.

  Image file cards fill the card; agent assignees use a robot glyph; tags centre their content.

  A task delegated to a chat is marked failed when the chat's model request fails, rather than staying started: `DelegationStrategy` gains an optional `onTurnFailed` hook, called when a turn fails (not when it is interrupted), and the supervisor fails the tasks the conversation holds, recording the error in the task's history. Delegating to a chat now names the chat as the assignee's `subject`, so the supervisor no longer mistakes the task for an orphaned sub-agent's; an agent standing for a non-session object reads as "Agent" rather than an id.

  A role-gated surface module (`AppCapability.surface` with `roles`) now logs an error when it loads if one of its surfaces binds a role it did not declare — the omission that left the `cardMasonry` surface unrendered wherever it was requested on its own.

- 631df48: A task's ID chip copies the task's full `echo://<space>/<id>` URI rather than `@mnemonic`, so the copied reference resolves wherever it is pasted; in the task list it reads the space from the live task rather than the row's snapshot.

  The terminal prints JSON — an object, or a string holding a JSON object or array — indented and highlighted, with keys, strings, numbers, booleans and null colored through the theme's ANSI palette.

  The terminal leaves a blank line after a command's output, and selected text is readable: the selection took a color token that does not exist, which resolved to the text color.

  The task list's filter button is filled and accented whenever anything narrows the list — a typed query as well as hidden statuses — so a filtered list is recognisable at a glance.

  In the task list a task's tags and artifacts sit on a line of their own under the title and above the description, instead of sharing the title line; the assignee stays right-aligned on the title line. `TaskTags` takes `assignee={false}` for a host that places the assignee itself.

  A task row's menu offers **Add sub-task**, which files an untitled task under that row, expands the row if it was collapsed, and opens the new task. A task editor focuses its title when the task has none, so the new task is named where it opens; an untitled row shows an "Untitled" placeholder.

  An answered question appears in the task's activity as one entry, the question with its answer, dated when it was answered; open questions stay in the article's Questions section, where each option is an item of its own. `TaskHistory` no longer takes `onAnswer`, and `TaskQuestion` no longer takes `date`.

  The task list's create pane takes files dropped or pasted on it (`TaskList.Editor` `acceptFiles`), holding them as chips until the task is created and then handing them to `onTaskCreate` with the draft. `onTaskCreate` may report a `TaskCreateResult`: `error` keeps the whole draft (a refused create no longer clears what was typed), `rejectedFiles` stay on the pane to retry, and a create that lands late clears only fields still holding what was sent; the task set article offers it only where a plugin can store files, and attaches them to the new task.

  In a hierarchical task list `Tab` indents the focused task under its previous sibling and `Shift+Tab` outdents it to follow its parent, alongside the existing `Shift+Arrow` moves; `Tab` is left to move focus when there is nothing to indent under or focus is on a control inside the row.

  The task set's filter — the query text and the statuses shown — is kept per device and per set (`TaskSetView.aspect`, the view-state `local` backend), so it survives navigating away and reloading.

  A tree row keeps focus after a key the consumer handles on it (e.g. a restructuring `Shift+Arrow` or `Tab` in the task list), so consecutive moves work without refocusing the row.

  `.dx-tag` no longer carries a margin, so chips are spaced only by their container's `gap` and tags and tag-styled buttons line up evenly; containers that relied on the margin (select cells in the grid, chat references, plugin list tags, devtools tree, card rows) now own a gap, and tags inline in CodeMirror text and the transcript gutter keep a local `mx-0.5`.

  Which branches of a task set's list are open is kept per device and per set, as a task id → open map on `TaskSetView.aspect`, so a collapsed branch stays collapsed across navigation; a task absent from the map is open, as before.

- 928e0b2: Tree rebuilt on `@ark-ui/react` TreeView — full APG keyboard navigation (arrows, Home/End,
  typeahead, `*`), machine-managed focus and ARIA, atom-model walk into a controlled TreeCollection,
  pragmatic-drag-and-drop retained, animated disclose/conceal; `TreeItemHeading`/`TreeItemById` removed.
- 520c34f: A tree branch no longer clips its first and last rows at rest. The branch content carried `overflow-y: clip` permanently for the disclose/conceal height animation, which cut the 2px focus ring off any control on a branch's first or last row (visible as a ring with a flat top in the task list). The clip now rides in the `tree-disclose`/`tree-conceal` keyframes, so it applies only while the height is moving.
- Updated dependencies [d4b4919]
- Updated dependencies [4da1052]
  - @dxos/ui-types@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- e65432c: Rework the light-mode surface ladder and control states.

  Surface levels, separators, wells, scrollbar thumbs and rail tones are now
  derived from the enclosing `--surface-bg` and attenuated for light mode through
  a single `--dx-attenuate-*` table, replacing several fixed neutrals that had
  drifted from the ladder. Filled controls derive their hover from their own fill
  (`--color-input-bg-hover`) rather than from the host surface, so hovering a
  default button no longer lightens it into the selected tone. `Panel.Toolbar`
  owns the toolbar bar treatment, so a nested `Toolbar.Root` matches content width
  without floating. Cards now carry their padding unconditionally.

- c58ebb7: Export design tokens as `@dxos/ui-theme/tokens.css`, so stylesheets compiled outside this repo — Composer plugins loaded from the registry — can generate token-backed utilities themselves rather than relying on whichever ones the host happens to bundle.

### Patch Changes

- 4df6cf3: Disable the Tailwind/Vite file watcher in `ThemePlugin` when running under Vitest. Its `server.watch` config was a non-null object that overrode the test runner's `watch: null`, keeping a live watcher whose per-file `fs_event` handles (registered by Tailwind's `@source` scan) were never released — hanging single-pass `vitest run` teardown so the process never exited. HMR-ignore patterns are retained for interactive `storybook dev` / `vite dev`.
- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/node-std@0.11.0
