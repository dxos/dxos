# @dxos/react-ui-terminal

## 0.12.0

### Minor Changes

- d79aaf4: Run the dx CLI in the browser. `@dxos/react-ui-terminal` is a new package hosting an `@effect/cli` command tree in a terminal emulator — an Effect `Terminal` and `Console` over xterm, a line editor, and a shell loop — and `@dxos/plugin-devtools` mounts the real `dx` commands on it as a devtools panel.

  Getting the commands into a browser bundle needed three changes. `@dxos/cli-util` no longer re-exports the OAuth callback server from its root entry (it moved to `@dxos/cli-util/oauth`, keeping `@effect/platform-bun` out of the default import graph), and `copyToClipboard`/`openBrowser` now resolve to a web implementation outside Node instead of shelling out via `node:child_process`. `@dxos/plugin-space` gains a `./commands` export, and its `database` command is now typed by its services rather than widened to `any` — that widening erased the requirement channel for every command tree composing it, so callers got no indication of which layers they had to provide.

  CLI command modules now activate on demand rather than at startup: `AppCapability.commands` gates on the new `ActivationEvents.CommandsRequested`, which `createCliApp` awaits during boot and a browser host fires when a terminal opens. A host that reads `Capabilities.Command` without going through `createCliApp` must fire and await that event first, or the tree comes back empty.

### Patch Changes

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

- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [fd23a8b]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [782a442]
- Updated dependencies [472ca95]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [882ac2a]
- Updated dependencies [818a096]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [d4b4919]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [6a1ec57]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [928e0b2]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [6dadb41]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
