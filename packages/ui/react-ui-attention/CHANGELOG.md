# @dxos/react-ui-attention

## 0.18.0

### Patch Changes

- Updated dependencies [0471a3a]
- Updated dependencies [b11bcdc]
- Updated dependencies [5a43453]
- Updated dependencies [0d5f1c0]
  - @dxos/react-ui@0.18.0
  - @dxos/invariant@0.18.0
  - @dxos/keys@0.18.0
  - @dxos/log@0.18.0
  - @dxos/react-focus@0.18.0
  - @dxos/react-hooks@0.18.0
  - @dxos/ui-theme@0.18.0
  - @dxos/ui-types@0.18.0

## 0.17.0

### Minor Changes

- cb058b9: `AttentionGlyph` draws activity in four slots (fill, mark, edge, corner) from a `treatments` prop; each treatment names its slot, hue, mark, priority and whether it animates, and at most one slot animates. The navtree glyph shows the progress monitors keyed `<uri>#<suffix>` to an object (new `useObjectProgressMonitors` hook): a pulsing star while one runs, a red edge when one fails. Agent turns report themselves as trace status updates (`withTurnStatus` in `@dxos/agent-runtime`), on the chat and on a companion chat's subject (`Chat.getCompanionSubject`), so a turn shows wherever it runs; `@dxos/compute` exports the terminal status messages (`Trace.StatusComplete`, `StatusFailed`, `StatusError`, `StatusCancelled`), and `StatusError` (`Failed`) ends a run that is not a sync without calling it one. Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments`. `@dxos/ui-types` exports `Hue`, which `IconHue` aliases; `Icon` accepts the `primary` hue.
- 2176f79: A follower now lands where the leader is scrolled in any article inside a `ScrollArea`, with no follow code in its plugin, and an article comes back where you left it when its plank remounts. Plugins can opt a viewport out with `follow={false}` on `ScrollArea.Viewport`, follow only some fields of a `ViewState` aspect with `follow: { policy: 'write', fields }`, and mark a section with `HomeSection.Root`'s `anchor` so a follower at another width keeps it at the top.
- 3d22d48: You can follow a peer around a space. Follow sits next to Jump and Go to on a peer's row and follows whichever of their sessions moved last; with the sessions toggle on, each session row has a Follow that stays on that session. While you follow, your deck shows theirs: the same planks in their order, scrolled to the plank at the front of theirs, with each plank keeping their top line at the top and the companions they have open. With no planks reported, it opens the object they attend, at the path they opened it from. None of it moves your caret or focus, and they send their location every 100 ms instead of every second. A plank your deck has no URL binding for (a type from a plugin you lack) is left out, and your deck scrolls to the nearest plank of theirs it holds instead. Scrolling, clicking or typing in a plank, attending an object outside what you show of them, going back or forward in history, or pressing Escape stops it, and so does the leader being gone from the space for five seconds. A follow pauses while you cannot open what they attend and picks up again once you can. The Members tab shows a dot while you follow, and the leader's row sits first in its list with Stop. A `Locator` reveal takes `follow` to scroll without moving the caret and answers whether it revealed the anchor, so a follower whose editor mounts late still lands on the leader's line, a deck companion's `badge` atom can hold `true` to draw a dot, and `LayoutOperation.Set` takes `focus: false` to focus no plank and a `workspace` to set the planks in, as `Open` does. View state can now be followed: a `ViewState` aspect declared with `follow: 'write'` has its values for the space and each open object sent with presence, and a follower writes the leader's into its own view state; one declared `follow: 'reveal'` is sent for the follow to apply. The deck reports its front plank as the space's `ViewLocation` and its open companions as `AppCapabilities.Companions`, and the follow applies them with `LayoutOperation.ScrollIntoView` and `UpdateCompanion`. A project's view state is followed, so a follower sees the leader's tab, spec and chart; so is a presentation's slide, and a drawing's camera in tldraw, excalidraw and the 2D canvas, which a drawing variant takes as `camera` and reports with `onCameraChange`. The 2D canvas editor applies a host camera that changes while it is open. A project's view state is now keyed by its EID, so the tab each project last showed resets once. `GraphPath.getEidFromPath` names the object a graph path points at. A schema form's boolean field carries its JSON path as `data-testid`, as text fields do. Leading shows too, in amber on every screen: the Members tab's dot appears on both sides, a follower's leader row rises to the top of Members and carries Stop, and a leader sees its followers under "Following you". Every plank heading, companions included, washes in amber over a one-pixel underline while you follow or are followed, through a new `AppCapabilities.LayoutAccent` the deck applies, and those people's avatars ring in amber. A deck companion takes a `badgeHue` for its rail dot.

### Patch Changes

- b8e76f9: Peers' avatars now act on what they view. Clicking an avatar opens the object's viewers with that row highlighted, each with Go to (open the object where the peer has it open in the tree, such as under a collection) or Jump (reveal the peer's selection or viewport, once the object is open). A peer with the object open in several tabs or on several devices is one row whose Jump goes to the session that moved last; a toggle in the list's toolbar lists their sessions under it, each named by its device ("Chrome on macOS"), with a dot for whether it moved in the last minute. A "See everyone in this space" button opens a Members companion listing every online peer by the object they view. Revealing an anchor moved from `CommentConfig.scrollToAnchor` to a per-type `AppCapabilities.Locator`, and `LayoutOperation.ScrollIntoView` drops `cursor`. New devices no longer get a placeholder label, and `getDeviceLabel` (from `@dxos/client/halo`) treats the old placeholders as no label, so devices are named from their platform and OS. A graph node that leaves and comes back, such as a peer who visits Settings, is expanded again, so its row keeps Go to and Jump. Jump goes to a peer's caret only once they have placed one, otherwise to the top of their viewport, and the avatars open the viewers list from the keyboard too.
- Updated dependencies [cb058b9]
- Updated dependencies [df16fba]
- Updated dependencies [b0113a1]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [3aef671]
- Updated dependencies [2176f79]
- Updated dependencies [9d66bcd]
- Updated dependencies [b15e5c3]
- Updated dependencies [17a9e75]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [80818bc]
- Updated dependencies [4fe25ee]
- Updated dependencies [0ad95b7]
- Updated dependencies [7da5d17]
- Updated dependencies [ca2a4a8]
- Updated dependencies [b8e76f9]
- Updated dependencies [7e07e49]
- Updated dependencies [9f2cacf]
- Updated dependencies [8a66e4e]
- Updated dependencies [d00cc85]
- Updated dependencies [768db81]
- Updated dependencies [10b3963]
- Updated dependencies [1a0fff1]
- Updated dependencies [e67aa80]
  - @dxos/react-ui@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/log@0.17.0
  - @dxos/react-focus@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/log@0.16.0
  - @dxos/react-focus@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [55bdf55]
- Updated dependencies [25af912]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
  - @dxos/react-ui@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/log@0.15.0
  - @dxos/react-focus@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [b07f49f]
  - @dxos/react-ui@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/log@0.14.0
  - @dxos/react-focus@0.14.0
  - @dxos/react-hooks@0.14.0
  - @dxos/ui-types@0.14.0

## 0.13.0

### Minor Changes

- 321c99f: Every `@dxos/react-ui` component family is now a namespace module with its own subpath. A compound family exports its parts: `import * as Dialog from '@dxos/react-ui/Dialog'` gives `Dialog.Root`, `Dialog.Content` and `Dialog.RootProps`. A single component keeps its own names: `<Icon.Icon>`, `Icon.IconProps`. Related components share a namespace: `Button` (`Button.Root`, `Button.Toggle`, `Button.Menu`, `Button.Group`), `Input` (`Input.Root`, `Input.Textarea`, `Input.Number`, `Input.Password`, `Input.Pin`, `Input.Date`, `Input.Slider`, `Input.Frame`, `Input.Checkbox`, `Input.Switch`), `Layout` (`Layout.Flex`, `Layout.Grid`, `Layout.Container`, `Layout.Block`, `Layout.Separator`), `Status` (`Status.Empty`, `Status.Skeleton`, `Status.Deferred`, `Status.Error`, `Status.Progress`, `Status.Steps`), `Typography` (`Typography.Text`, `Typography.Link`, `Typography.Timestamp`, `Typography.Crawl`) and `Media` (`Media.Image`, `Media.Player`). `ThemeProvider` is now `Theme.Provider`. General hooks live in `@dxos/react-ui/Hooks` (`Hooks.useTranslation`) and composition helpers in `@dxos/react-ui/Util`. The root exports namespaces only, so `import { Dialog } from '@dxos/react-ui'` still works, but flat names such as `ButtonProps` and `useTranslation` are gone, and so are the `@dxos/ui-types` re-exports (import those from `@dxos/ui-types`).

  `AttentionGlyph` moves from `@dxos/react-ui` to `@dxos/react-ui-attention`.

### Patch Changes

- Updated dependencies [d2a6aad]
- Updated dependencies [7d222fc]
- Updated dependencies [1b37aa8]
- Updated dependencies [321c99f]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/log@0.13.0
  - @dxos/react-focus@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/ui-theme@0.13.0
  - @dxos/ui-types@0.13.0

## 0.12.0

### Patch Changes

- f4e481a: Navigation in the deck is smoother in three ways. A plank's heading no longer paints its sigil and title as unattended for a frame before flipping: a newly opened plank is attended from its first painted frame. Opening a plank crossfades the content region where the browser supports a view transition. A deck showing several planks at once no longer opens a companion pane beside every one of them before the reader has opened or closed a single one.
- 08cddf6: Clicking a document in the navigation tree moves attention to the plank it opens, while focus stays on the tree row so the arrow keys keep working. Before this, attention stayed on the document you left. Opening a document within a workspace now crossfades in 50ms instead of 200ms.
- Updated dependencies [6a457ac]
- Updated dependencies [2d58ea5]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [8cb5553]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [08cddf6]
- Updated dependencies [07531e0]
- Updated dependencies [d4b4919]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6a1ec57]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [928e0b2]
- Updated dependencies [520c34f]
- Updated dependencies [77d0026]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/log@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/echo@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/log@0.11.1
- @dxos/react-hooks@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- 3b4a7c8: The inbox message view selector (HTML / Markdown / Plain) now persists across messages and sessions. The choice is stored alongside the other inbox settings (the `loadRemoteImages` toggle) in the plugin's settings store, so it survives reloads instead of resetting to HTML on every open. Also reorganizes `useArticleKeyboardNavigation` under `AttentionProvider` (no change to the `@dxos/react-ui-attention` public exports).
- 9f7d5ad: Replace `CommentConfig.getAnchorLabel` with a typename-keyed `AppCapabilities.AnchorResolver` capability; the assistant companion chat now includes the markdown editor's current selection as request context. Fix view-state persistence so a written value (e.g. a text selection) survives without a live subscriber instead of being garbage-collected back to its default.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/invariant@0.11.0
