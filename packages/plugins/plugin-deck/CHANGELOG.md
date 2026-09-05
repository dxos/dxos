# @dxos/plugin-deck

## 0.12.0

### Minor Changes

- 6d28380: Composer renders mobile natively, projecting the active deck as a navigation stack with a companion
  drawer; plugin-simple-layout is retired and the layout mode it reported as `'simple'` is now
  `'mobile'`. `Card` with `fullWidth` tracks its container instead of holding a minimum width.

  The mobile renderer itself lives in the new (unpublished) `@dxos/plugin-mobile`, which reads deck
  state and owns no state of its own. `plugin-deck` keeps every operation, the URL handler and the
  layout state, and `DeckPlugin.make({ platform: 'mobile' })` now means headless: it contributes no
  React root and no mobile surfaces, leaving those to the mobile plugin. Deck additionally exposes a
  `./hooks` entrypoint, `./overlays` (the shared dialog/popover/toaster shell) and `./testing` (the
  story harness) so a co-registered renderer can drive them.

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [6d52561]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [9c86066]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [6d28380]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [3214dcf]
- Updated dependencies [24fcadc]
- Updated dependencies [77a2d34]
- Updated dependencies [5ae704b]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [19f19a2]
- Updated dependencies [987f7e1]
- Updated dependencies [1ab4bb8]
- Updated dependencies [a78a66d]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [ea11703]
- Updated dependencies [886453b]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [f9816c0]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui-mosaic@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/util@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-dnd@0.12.0
  - @dxos/react-ui-tabs@0.12.0
  - @dxos/async@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/compute@0.11.1
- @dxos/context@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/operation@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/react-ui-tabs@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-attention@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-observability@0.11.1

## 0.11.0

### Minor Changes

- e7f0d9e: The deck companion now opens beside the attended plank instead of at the end of the deck: it shares that plank's container, split by a draggable seam whose geometry is the same for every plank/companion pair and in every presentation, and follows attention as the user moves between planks. Attending a plank also brings it to the front of the deck, collapsing the planks after it into the trailing spine pile. The "open companion" control is offered on every plank that has one, and a URL restoring a companion attends the plank it was anchored to. The sliding deck also runs flush to both ends of the viewport (`--main-spacing` is a gap only), and the plank at the front is capped to exactly the space the two spine piles leave it, so the plank after it folds to a spine instead of wedging a part-drawn header against the current plank.
- 5585ec8: Redesign Composer URLs as pair chains (`/w/<workspace>/<key>/<id>/…`) resolved by the graph builder via per-extension `url: { key, kind, path }` declarations (replacing the `NavigationPathResolver` capability), and collapse the deck's layout modes into a single mode: presentation derives from plank count (fullbleed / tiling / sliding) and fullscreen is transient. Navigation is now gesture-based (no `navigationDefault` setting): nav-tree plain click navigates solo (shift adds a plank), and in-plank/card navigation follows the deck — adding beside the origin when sliding and replacing when solo. `LayoutOperation.Open`'s `disposition` values are `solo | add | auto`. Breaking: `LayoutOperation.SetLayoutMode` is removed, `?plank=` URLs are replaced by the pair-chain grammar, `AppCapabilities.NavigationTargetResolver` now declares its real requirement (`Effect<NavigationTarget[], never, Database.Service>`) so implementations no longer need a cast, and the unused `companionFrameSizing` field is dropped from the deck's persisted state (stripped by the existing migration).

### Patch Changes

- bce1dbc: Fix the companion panel failing to open when a caller names only the variant (`~comments`, `~transcript`, `~settings`) rather than a fully qualified companion id.
- ebb6383: Clicking a folded plank's spine now attends that plank instead of handing attention straight back to whichever plank was already on screen; the plank toolbar's fullscreen and close controls are offered regardless of how many planks are open; and the navtree marks the open item as current immediately rather than up to half a second later.
- 1dad41e: Fix the navigation sidebar disappearing permanently at desktop widths after a dismissal persisted from below the `lg` breakpoint.
- f10b1ce: Plugin-declared decks and deck scroll stability. A type can now declare how the deck behaves when one
  of its objects is the root: `AppAnnotation.DeckAnnotation` carries a `DeckSpec` (initial planks and a
  chain of levels), `LayoutOperation.Open` accepts `root` + `level` so opening at a level reuses that
  level's plank and closes the levels below it, Collections are navigation targets that open their
  contents as planks, and the mailbox declares `mailbox / message / attachment` (meta-click opens a
  message in its own plank; a message swap carries the open companion along). Deck scrolling is now
  strictly intent-driven: an in-deck click yields to the navigation it triggers, navigations re-issue
  if a reflow kills the glide, browser scroll anchoring is disabled on the deck viewport, a companion
  opening past the trailing edge is revealed by exactly the overflow, and stale `companionPlanks`
  entries are pruned.
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
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
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
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
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
  - @dxos/ui-types@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-ui-tabs@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
