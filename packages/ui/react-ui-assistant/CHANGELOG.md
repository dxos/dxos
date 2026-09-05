# @dxos/react-ui-assistant

## 0.12.0

### Minor Changes

- 4cb12a9: The virtualizer graduates to `@dxos/react-ui-virtual` (anchor-relative placement, `useWindow`/`Window`, the follow aspect, and the told-model `ListModel`), and the assistant chat surface ships as `@dxos/react-ui-assistant` — the `ChatThread` composite on the feed engine, with the view-typed renderer, the XML widget registry, and the prompt/answer chrome. `@dxos/react-ui-feed` now depends on `@dxos/react-ui-virtual` and no longer exposes its `/virtualizer` entry point.
- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

### Patch Changes

- 4521dec: Every new chat now carries the planning skill, so a conversation can read and update the durable task checklist it already holds rather than answering task questions from nothing. A new "Coding Chatroom App" space template seeds a brief, a five-stage plan as a task tree, and a Development skill covering how work is tracked and how managed agents are briefed. `SetSessionCredentials` and `RevokeSessionCredentials` are replaced by a single `UpdateSessionCredentials` operation whose `refresh` mode re-reads every credential a running session already holds, so a rotated OAuth token no longer needs the session restarted — the two removed operations were also invisible to the model, since a `Schema.NonEmptyArray` input serialized to a JSON-schema keyword the tool resolver could not project. In the thread, a system-generated turn renders in its own framed panel again instead of as the model's own prose, and status and reasoning blocks fold into the tool run they narrate — including a run that never reaches a call — so a turn spent only narrating reads as one row rather than a widget per block.
- 0a7d273: MessageChrome no longer throws when rendered without its provider; the context now defaults to empty so the chrome degrades to its default behavior instead of crashing the thread.
- 89bca65: Render an assistant `<reference>` tag inline so surrounding prose flows around it.
- 9986e16: Tool rows in the assistant's run panel are titled by the backing operation's name and icon, the collapsed summary carries the same glyph as the rows it opens onto, and `status`/`reasoning` blocks fold into the run they narrate instead of splitting it into a panel per call. The summary reads `<last status> (ran X commands)` while the model is narrating, the command name for a lone call, and `Ran X commands` otherwise.
- 211ae8e: Tool call panels now show the call's parameters (and the result payload / error message) instead of the raw content block's transport metadata, and a streamed pending call is replaced by its completed form rather than shown as a duplicate tab.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [0fe00c5]
- Updated dependencies [f3f55a8]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [41e2750]
- Updated dependencies [ebb8f4a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [c0e5651]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [6c881a2]
- Updated dependencies [cc9b81f]
- Updated dependencies [4cb12a9]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [f9816c0]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [4ae2005]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/types@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/react-ui-feed@0.12.0
  - @dxos/util@0.12.0
  - @dxos/react-ui-syntax-highlighter@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/keys@0.12.0
