# @dxos/plugin-navtree

## 0.12.0

### Minor Changes

- 329faa0: The URL is now the deck's only record of what is open, and the relationship between the two is one-way: an operation computes a target and pushes the URL, the URL is projected into deck state, the deck renders. Nothing else writes what is open. This replaces a bidirectional sync between the address bar and persisted deck state that needed five separate guards to referee it, and whose failures cleared the URL on reload.

  A URL resolves asynchronously, so the projection applies it twice: once synchronously by the pairs themselves, so the planks the URL names render their chrome immediately, and again once each pair has resolved to a graph node. Per-plank preferences and the closed-plank record hang off a plank's URL segment rather than its id, so they survive that refinement. A plank whose node has no URL binding cannot be opened and is logged with the extension that produced it.

  `AppGraphBuilder` no longer stamps `properties.urlSegment` onto nodes, and the `BuilderNode` type that described the stamped shape is gone. A node's URL representation comes from `PathResolution.representNode`, which reads the producing extension's binding and so still works for a node whose subtree has momentarily left the graph.

  What is open is no longer persisted. `active` and `inactive` moved out of the deck's stored state into `EphemeralDeckState.open`, keyed by workspace, and `DeckCapabilities.getDeck` merges them with the workspace's persisted preferences so nothing downstream has to know which atom a field came from. A workspace's open planks are remembered for the session and no longer: the URL records only the workspace you are in, so a reload seeds any other workspace from its first child as it does on a first visit. The persisted-state migration is deleted along with them, since a stored blob now carries only preferences and dropping a field the deck no longer knows costs nothing.

  Breaking for plugin authors: `LayoutOperation.Open`'s `navigation` option is no longer read, a node needs a `url` binding on its graph-builder extension to be openable as a plank, and the pinned workspaces lost their `!` id prefix. A plugin's own workspace is now named the way a plugin should name one, by its namespace: `dxos:settings`, `dxos:registry` and `dxos:account`. No space id can collide with a name of that shape, so the namespace is what keeps two plugins from claiming the same workspace.

- 8efc4f1: A navtree drop between containers that share a move scope moves the item, a drop onto a target that takes links links it, and the indicator is dashed when the item will end up listed with its parent elsewhere; rearranged rows land under the drop line, which now sits in the gap between rows. App-graph applies updates to nodes already in the graph on a microtask while the frame's budget lasts and defers the rest to its scheduler, so a small edit renders in the frame it was made. `ContainerModel` replaces `CollectionModel`, `Obj.parentAtom` follows an object's parent reactively, and `Tree` takes `getDropKind`. Breaking: `CollectionModel` is renamed `ContainerModel`, `Tree`'s `blockInstruction` becomes `getDropKind`, and navtree nodes use `onMoveOut`, `onMoveIn` and `onLink` in place of `onTransferEnd`, `onTransferStart` and `onCopy`.
- 5662dfc: Render avatar fallbacks whose emoji rely on a variation selector (☀️, ⚙️, ♻️ …) instead of a coloured circle with no symbol. Spaces that are listed but not yet open now hold a place in the sidebar rail, and the account corner holds a plain circle while the client initialises.

### Patch Changes

- 9e449df: Fix the L0 rail insetting its items by the scrollbar strip, which narrowed the space around the
  workspace avatars and pushed the active-tab indicator underneath them.
- 59a1fa2: Opening an item from the navtree no longer expands it. `Expose` now opens only the item's
  ancestors, as its spec says. It used to open the item's own row as well, so selecting a project
  also showed its children. The chevron, `Space` and option-click still expand a row.
- 3214dcf: **Breaking:** `Graph.expand` is renamed to `Graph.expandSync`, and `Graph.expand` now returns an `Effect` that runs the expansion off the paint-critical path. Both overloads (direct and curried) are preserved on `expandSync`, so migrating is a rename. Interrupting the new `expand` cancels a still-pending expansion, which makes superseding one scheduled expansion with another a matter of interrupting the previous fiber.

  Expanding a node also no longer blocks the main thread on stack-trace capture. `Atom.withLabel` records a stack trace on every call, and the graph labelled an atom per node, per connection key and per extension, so a single expansion cost hundreds of captures — measured at 17ms with 40 registered extensions. Labels are now opt-in via `VITE_ATOM_LABELS` under the dev server.

  The nav-tree's hover prefetch uses the new scheduled `expand` behind a 150ms settle delay, so moving the cursor across rows only expands the row it stops on.

  The tooltip context is split so that pointing at a trigger no longer re-renders every `Tooltip.Trigger` in the app, and the open tooltip's `data-state`/`aria-describedby` are applied to the active trigger alone rather than to all of them.

- 1a3de22: Fix the command palette and search dialog keyboard contract. Both now focus their input on open
  (so Enter runs the highlighted entry instead of the dialog's Close button), keep the first result
  highlighted as the query changes, and close on Escape rather than only clearing the query.
  `Picker.Input`/`SearchList.Input` gain `escapeBehavior`, `SearchList.Root` gains
  `resetSelectionOnChange`, and `resolveKeyBinding` in `@dxos/util` applies the platform fallbacks
  everywhere a shortcut hint is rendered — shortcuts were blank on Linux despite firing.
- 605455c: `Tree` rows treat cursor, selection and collapse as one gesture each.

  The pointer now belongs to rows a click selects, rather than to every row: a row that can only be
  dragged takes the open hand, and a draggable row shows `grabbing` for the press that starts the
  drag. Selection no longer discloses — a branch that `canSelect` refuses discloses on click (it
  previously did nothing), and a selectable one only ever selects, with the chevron, `Space` and
  option-click still disclosing either way.

  A selected row could not be re-selected: the row reported the flip of its own state, deselecting it,
  and the machine selected it again on the same click. Re-activation now reports the row as staying
  current, matching `Enter`, and `selectNode`'s `current` argument is required — the flipping default
  also read a machine event for an already-current row as a deselect. Single selection still has no
  deselect-by-click gesture.

  A collapse commits on the gesture instead of waiting out its animation, and the conceal rides the
  machine's own `data-state`. The chevron, the model and the machine no longer disagree for the
  length of the animation, and a click arriving mid-collapse reopens the branch rather than being
  swallowed.

  In the navtree, a graph node with no data is reported as unselectable, matching the select handler,
  which already ignored it: synthetic sections such as the Collections row now disclose on click and
  offer no pointer.

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [6a457ac]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [3c7b013]
- Updated dependencies [f4e481a]
- Updated dependencies [c020513]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [b8762ef]
- Updated dependencies [2d4107f]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [864cd0d]
- Updated dependencies [b4a84e6]
- Updated dependencies [5305365]
- Updated dependencies [a3d45c4]
- Updated dependencies [dd17e57]
- Updated dependencies [bb22f38]
- Updated dependencies [513cac6]
- Updated dependencies [6d28380]
- Updated dependencies [57d460a]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2643a00]
- Updated dependencies [dbff1e4]
- Updated dependencies [2e4c299]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [3ea0b0f]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [ce194c0]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [c0e5651]
- Updated dependencies [07531e0]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [5662dfc]
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
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [dea5df9]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [56276cd]
- Updated dependencies [886453b]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [63629c5]
- Updated dependencies [6a1ec57]
- Updated dependencies [e3d7a8c]
- Updated dependencies [0c92b44]
- Updated dependencies [5dedae9]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [4ae2005]
- Updated dependencies [605455c]
- Updated dependencies [ff93962]
- Updated dependencies [9d8fcbd]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [11de244]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/plugin-deck@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/compute@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/keys@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/random@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/react-ui-tabs@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-deck@0.11.1
- @dxos/plugin-graph@0.11.1

## 0.11.0

### Patch Changes

- a97a5ca: Show a message in the sidebar when the active workspace is not available instead of rendering an empty nav tree, and stop serializing the unresolved-workspace sentinel into the URL.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [bce1dbc]
- Updated dependencies [e7f0d9e]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [ebb6383]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
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
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [105dac4]
- Updated dependencies [37c17cc]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-deck@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-ui-tabs@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/random@0.11.0
  - @dxos/debug@0.11.0
