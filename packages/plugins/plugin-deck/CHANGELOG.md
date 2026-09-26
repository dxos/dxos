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

- 329faa0: The URL is now the deck's only record of what is open, and the relationship between the two is one-way: an operation computes a target and pushes the URL, the URL is projected into deck state, the deck renders. Nothing else writes what is open. This replaces a bidirectional sync between the address bar and persisted deck state that needed five separate guards to referee it, and whose failures cleared the URL on reload.

  A URL resolves asynchronously, so the projection applies it twice: once synchronously by the pairs themselves, so the planks the URL names render their chrome immediately, and again once each pair has resolved to a graph node. Per-plank preferences and the closed-plank record hang off a plank's URL segment rather than its id, so they survive that refinement. A plank whose node has no URL binding cannot be opened and is logged with the extension that produced it.

  `AppGraphBuilder` no longer stamps `properties.urlSegment` onto nodes, and the `BuilderNode` type that described the stamped shape is gone. A node's URL representation comes from `PathResolution.representNode`, which reads the producing extension's binding and so still works for a node whose subtree has momentarily left the graph.

  What is open is no longer persisted. `active` and `inactive` moved out of the deck's stored state into `EphemeralDeckState.open`, keyed by workspace, and `DeckCapabilities.getDeck` merges them with the workspace's persisted preferences so nothing downstream has to know which atom a field came from. A workspace's open planks are remembered for the session and no longer: the URL records only the workspace you are in, so a reload seeds any other workspace from its first child as it does on a first visit. The persisted-state migration is deleted along with them, since a stored blob now carries only preferences and dropping a field the deck no longer knows costs nothing.

  Breaking for plugin authors: `LayoutOperation.Open`'s `navigation` option is no longer read, a node needs a `url` binding on its graph-builder extension to be openable as a plank, and the pinned workspaces lost their `!` id prefix. A plugin's own workspace is now named the way a plugin should name one, by its namespace: `dxos:settings`, `dxos:registry` and `dxos:account`. No space id can collide with a name of that shape, so the namespace is what keeps two plugins from claiming the same workspace.

- 3c85350: Composer now unloads the parts of the graph nothing is showing, and rebuilds them when you return. Plugins contribute `AppCapabilities.AppGraphRetention`s naming the nodes they need, as `{ id, depth? }`, and once any is installed the builder releases what none of them reaches below the root's children. A retention also names the relations whose targets live and die with their source (`attached`), so nothing but the policy decides what counts as a level. The deck keeps the whole of the active workspace, the previous one, and any workspace with a plank on screen, and names `action` and `companion` attached; the debug panel keeps its tree for the session.

  A node's URL now comes from the shape of its id rather than from the extension that produced it, so a node has the same URL whether or not it is loaded, and `Open` navigates at once instead of waiting for its subjects to load. A `UrlBinding` declares its shape with `path` (always segments), `minDepth` (the fewest segments its id spans, default 1), and `workspace`, and a singleton is its key below `path`; a data-dependent binding adds `resolve` for forward resolution, and its id is the node's last segment.

  Breaking: `AppGraphNode.actionRelation()` and `childRelation()` are now the constants `AppGraphNode.action` and `AppGraphNode.child`, with `AppGraph.inverseRelation` for the inbound side; companions now attach through `AppNode.companion` rather than `child`, so an extension returning `AppNode.makeCompanion` or `makeDeckCompanion` must declare that relation, and companions are read with `graph.connections(id, AppNode.companion)`. `GraphBuilder.Store` requires `release` and `outgoing`, `GraphBuilderProps.structural` is replaced by `Retention.attached`, `setRetention` takes a list, `AppCapabilities.AppGraphRetention` is a multi capability, `GraphTreeModelOptions` is removed, and `UrlGrammar.linkedKey`/`linkedPrefix` are now `linked: { key, relation, prefix }`, each field defaulting (`'linked'`, `'linked'`, `'~'`); the app graph learns the linked relation from the grammar, and a reader expands the relation itself. `NotFound.expandPath` is now `AppGraph.expandPath`. A `UrlBinding`'s resolver moves from `path` to `resolve`, `urlRepresentation` returns an `Option`, `GraphBuilder.getNodeExtensionId` and `Inline.owned` are removed, database views are addressed as `db/<type>+<id>` rather than `view/<type>+<id>`, commerce providers as `commerce/<id>` rather than `commerce/providers+<id>`, registry plugin nodes sit under a hidden `plugins` node, and a type section with a `sectionUrlKey` is named by that key (`createTypeSectionPaths` takes it too).

### Patch Changes

- f4e481a: Navigation in the deck is smoother in three ways. A plank's heading no longer paints its sigil and title as unattended for a frame before flipping: a newly opened plank is attended from its first painted frame. Opening a plank crossfades the content region where the browser supports a view transition. A deck showing several planks at once no longer opens a companion pane beside every one of them before the reader has opened or closed a single one.
- b4a84e6: Collapsing the complementary sidebar no longer forgets which panel was selected, and the sidebar no longer collapses at startup while its companion panels are still loading.
- dd17e57: Deck companions in the complementary sidebar can set `mount` on their node: `always`, `selected` (the default, today's behaviour), or `open`. The trace panel stays mounted, and the Database panel unmounts while the sidebar is collapsed, which stops its query over the whole space.
- bb22f38: Switching companions in the deck's complementary sidebar no longer shows a blank panel while the selection is saved; the clicked companion mounts and highlights at once.
- 513cac6: - plugin-deck: an in-app navigation opens a plank under the node id it already holds, so the projection no longer mounts a placeholder plank and then re-keys it — which remounted the plank and its companion on every document switch.
  - plugin-deck: a plank and the place its companion sits are one container whether or not a companion is attached, so a companion arriving (or being toggled) resizes a seam that was already there instead of re-parenting the plank and rebuilding its editor.
  - plugin-projects: a project's Sessions and Artifacts branches and everything under them are addressed by the `project` key, extending the project's own id (`project/<project>+sessions+<session>`), so opening one from the navtree no longer fails with "node has no URL binding".
- 57d460a: A new identity's default space opens on first run even when its Home is not in the app graph yet.
- 6af89f4: Clicking the active space on the rail now slides the navigation sidebar instead of snapping it, and opening a companion shows the pane at once rather than after its URL resolves. Sidebar and layout slides run faster: 150 ms with an ease-out curve instead of 200 ms ease-in-out.
- df295b2: Stop the dialog and the app behind it flickering while a view transition runs. The app's dialog overlay now carries a `view-transition-name`, so the content group no longer paints over it and hides it for the length of every transition; the dialog's presentation is held as one value while it exits, so a closing dialog no longer loses its content, alignment and overlay styling while it is still on screen; and an open that crosses workspaces animates the chrome swap rather than hard-cutting to an empty deck.
- 08cddf6: Clicking a document in the navigation tree moves attention to the plank it opens, while focus stays on the tree row so the arrow keys keep working. Before this, attention stayed on the document you left. Opening a document within a workspace now crossfades in 50ms instead of 200ms.
- a1d42c4: Stop plank reveals and editor autofocus from stealing focus or dismissing open menus (`ScrollIntoView` accepts `focus: false`), and keep error messages and context errors in logs.
- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
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
- Updated dependencies [b8762ef]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [9c86066]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [dcf911b]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [8cb5553]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [251f586]
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
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ce194c0]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [07531e0]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [77a2d34]
- Updated dependencies [b00ee72]
- Updated dependencies [5ae704b]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [987f7e1]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [a78a66d]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [690dcaa]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
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
- Updated dependencies [e3d7a8c]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [631df48]
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
- Updated dependencies [a1d42c4]
- Updated dependencies [77d0026]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-mosaic@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/react-ui-dnd@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

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
