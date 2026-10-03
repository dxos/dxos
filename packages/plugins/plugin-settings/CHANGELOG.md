# @dxos/plugin-settings

## 0.13.0

### Patch Changes

- Updated dependencies [8fc641a]
- Updated dependencies [1894fc1]
  - @dxos/app-toolkit@0.13.0
  - @dxos/util@0.13.0
  - @dxos/compute@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/app-graph@0.13.0
  - @dxos/react-ui-form@0.13.0
  - @dxos/graph@0.13.0
  - @dxos/react-ui@0.13.0

## 0.12.0

### Minor Changes

- b72c1a2: Every `LayoutOperation.Open` caller now passes the qualified id of a node the app graph builds, so these opens land on their plank instead of doing nothing: trace-panel links, clipped pages, the routines settings panel (from mailbox, calendar and feed properties and from trigger templates), a newly opened folder (now a workspace switch), messages and events opened from a mailbox or calendar rendered without an `attendableId`, and anything opened from the spotlight window, whose forwarder now passes the whole `Open` input through. The generic database path plugin-space resolves for an object of a stored schema uses the schema's entity id, which is how the database section keys it, and `SpaceOperation.Create` returns the new space's Home path as its `subject`.

  Debug pages have no URL, so `Open` cannot reach them. The debug panel now passes `DebugSurface.PageData`, article data with an `onNavigate(nodeId)` that shows another page, and every page under `root/debug`, in plugin-debug and devtools, registers on the `DebugSurface.Page` role (`org.dxos.plugin.debug.surface.page`) instead of the article role. A plugin that adds a page to the debug panel must register it on that role.

  Breaking: `SettingsPath.getPluginRegistrySectionPath` is removed, along with plugin-settings' `OpenPluginRegistry` handler, which opened a path nothing builds. To open the registry, invoke `SettingsOperation.OpenPluginRegistry` (from `@dxos/app-toolkit/SettingsOperation`, no input); plugin-registry's handler switches to the registry workspace. A build without plugin-registry has no handler for it, so `SettingsOperation.isPluginRegistryAvailable(enabled)` says whether to offer it; the plugin-failure toast drops its registry action when it returns false. The waiting-for-object toast is removed with `SpaceOperation.WaitForObject` and the space plugin's `awaiting` state: the deck already shows a plank that is still loading and fills it in when the object arrives.

### Patch Changes

- 720c4df: Render plugin settings list icons, and the app Settings node, in the emerald hue of the space settings nodes instead of each plugin's hue.
- a04ab6e: Navigating to a collection in the navtree highlights the collection rather than the documents its deck
  opened in its place (`@dxos/plugin-deck/DeckSeed.sourceOf`), and choosing one of those documents
  selects it (`NavTreeCapabilities.State.pick`); a flattened deck opens the collection itself instead of
  showing its documents as a breadcrumb trail. `Tree` leaves a dragged row in place at half opacity
  (`hideDragSource` restores removal) and declares drags a move, so the cursor no longer flickers to a
  copy "+". `Gantt.Chart` opens scrolled to its newest events.

  Task list rows show a task's pull requests in their own column on the title line, left of the
  assignee; the assignee picker offers the space's members, the owner included (`TaskProperties` takes
  `members`); the assignee chip opens its session card on click rather than hover, which had left it
  stuck open. `tasks.create` and `tasks.update` reject an assignee that names no one — it must carry a
  contact, a member's `identityDid`, or an agent session. Copy-to-clipboard buttons use
  `SystemIconButton.Clipboard`, so they share one icon and the "Copied" confirmation.

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [3c7b013]
- Updated dependencies [c020513]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [b8762ef]
- Updated dependencies [2d4107f]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [5305365]
- Updated dependencies [9a36b1e]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [b63506b]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [318d610]
- Updated dependencies [ab56cfe]
- Updated dependencies [2643a00]
- Updated dependencies [362fd0f]
- Updated dependencies [dbff1e4]
- Updated dependencies [497caab]
- Updated dependencies [2e4c299]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [548e82c]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [9d0132f]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [3ea0b0f]
- Updated dependencies [4e4c25d]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [3294b3d]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [efdcf61]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [a04ab6e]
- Updated dependencies [77a2d34]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [d308bf8]
- Updated dependencies [07514c2]
- Updated dependencies [987f7e1]
- Updated dependencies [1ab4bb8]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [dea5df9]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [a805212]
- Updated dependencies [7263241]
- Updated dependencies [6fed038]
- Updated dependencies [0a27bde]
- Updated dependencies [886453b]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [63629c5]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [e3d7a8c]
- Updated dependencies [5dedae9]
- Updated dependencies [d205e96]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [11de244]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/util@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/compute@0.11.1
- @dxos/keys@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [5585ec8]
- Updated dependencies [5b05d75]
- Updated dependencies [68e61ca]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [6a03a30]
- Updated dependencies [717edc0]
- Updated dependencies [30ae5eb]
- Updated dependencies [5e7839e]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [1a989ed]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [848ba1b]
- Updated dependencies [7b270f2]
- Updated dependencies [ed992c2]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [5585ec8]
- Updated dependencies [499dde4]
  - @dxos/app-graph@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
