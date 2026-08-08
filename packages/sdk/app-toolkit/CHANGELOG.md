# @dxos/app-toolkit

## 1.0.0

### Minor Changes

- 0280a6a: Omitting `activatesOn` on a plugin module now puts it in the **idle** wave rather than the startup wave. A module that must run at boot has to declare `activatesOn: ActivationEvents.Startup` explicitly.

  This is a behaviour change for out-of-repo plugin authors: an un-annotated module that previously ran during startup now runs at host idle. Un-annotated modules remain pullable as providers, so one that a startup module `requires` is still activated ahead of its own wave — the change is only visible for modules nothing on the boot path depends on.

  The `@dxos/app-toolkit` maker families that back the app shell — `settings`, `operationHandler`, `reactContext`, `reactRoot`, `navigationResolver` and `navigationHandler` — now state `Startup` explicitly, so modules built with them are unaffected. `appGraphBuilder` (idle) and `skillDefinition` (assistant start) were already explicit.

- 678ba58: App configuration moves out of the personal space and into a dedicated **settings space**, and the personal space becomes an ordinary space.

  The settings space is tagged `org.dxos.space.settings`, locked at genesis so it can never be shared, EDGE-replicated so it follows the user across devices, and hidden from the navtree. It holds the cross-space navtree ordering, the Welcome-dismissed flag, and a new **personal space** setting that stores the id of the space to use as the default target for unscoped content (quick entry, chat, preview and entity lookup). That setting can be repointed at any space from Settings → Your spaces.

  A one-time migration runs on `SpacesReady`: it creates the settings space if absent, copies the space ordering across, designates the existing personal space, and stamps `Personal` into that space's `properties.name` (the display name used to come from a translation).

  `AppSpace.PERSONAL_SPACE_TAG` is deprecated — new profiles no longer set it, and it resolves legacy profiles only. `isPersonalSpace`, `setPersonalSpace` and `resolvePersonalSpace` are renamed to `isLegacyPersonalSpace`, `setLegacyPersonalSpace` and `resolveLegacyPersonalSpace`; `getPersonalSpace` keeps its name but now resolves the setting first. New: `SETTINGS_SPACE_TAG`, `isSettingsSpace`, `getSettingsSpace`, `readPersonalSpaceId`, `setPersonalSpaceId`.

  The space creation dialog gains a **Private space** toggle (default off, ahead of the EDGE replication toggle) which locks membership at genesis. Space sharing UI now keys off `space.membershipPolicy` rather than the personal-space tag, so the Members panel is hidden for any private space, not just the personal one. Renaming, re-iconing and deleting the personal space are no longer blocked, except that the space currently designated as personal still cannot be deleted.

  `HelpOperation.HideWelcome` no longer takes a `space` — the flag is app-wide. It is not migrated, so a dismissed welcome carousel reappears once.

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [3958355]
- Updated dependencies [557e243]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [7c426d4]
- Updated dependencies [0280a6a]
  - @dxos/app-framework@1.0.0
  - @dxos/echo@1.0.0
  - @dxos/react-ui@1.0.0
  - @dxos/react-ui-menu@1.0.0
  - @dxos/compute@1.0.0
  - @dxos/client@1.0.0
  - @dxos/ai@1.0.0
  - @dxos/app-graph@1.0.0
  - @dxos/client-protocol@1.0.0
  - @dxos/react-client@1.0.0
  - @dxos/schema@1.0.0
  - @dxos/types@1.0.0
  - @dxos/react-ui-list@1.0.0
  - @dxos/keyboard@1.0.0
  - @dxos/react-ui-attention@1.0.0
  - @dxos/react-ui-syntax-highlighter@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/errors@1.0.0
  - @dxos/i18n@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0
  - @dxos/progress@1.0.0
  - @dxos/protocols@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/i18n@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyboard@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/progress@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 30ae5eb: Add stable `data-testid`s across the inbox and connector UI (mailbox sync/reply/message actions, message and conversation tiles, connect dropdown) and an optional `testId` param on `AppNode.makeToolbarActionGroup` / `react-ui-menu`'s menu builder, enabling reliable browser-e2e targeting.
- 9f7d5ad: Replace `CommentConfig.getAnchorLabel` with a typename-keyed `AppCapabilities.AnchorResolver` capability; the assistant companion chat now includes the markdown editor's current selection as request context. Fix view-state persistence so a written value (e.g. a text selection) survives without a live subscriber instead of being garbage-collected back to its default.
- 5585ec8: Redesign Composer URLs as pair chains (`/w/<workspace>/<key>/<id>/…`) resolved by the graph builder via per-extension `url: { key, kind, path }` declarations (replacing the `NavigationPathResolver` capability), and collapse the deck's layout modes into a single mode: presentation derives from plank count (fullbleed / tiling / sliding) and fullscreen is transient. Navigation is now gesture-based (no `navigationDefault` setting): nav-tree plain click navigates solo (shift adds a plank), and in-plank/card navigation follows the deck — adding beside the origin when sliding and replacing when solo. `LayoutOperation.Open`'s `disposition` values are `solo | add | auto`. Breaking: `LayoutOperation.SetLayoutMode` is removed, `?plank=` URLs are replaced by the pair-chain grammar, `AppCapabilities.NavigationTargetResolver` now declares its real requirement (`Effect<NavigationTarget[], never, Database.Service>`) so implementations no longer need a cast, and the unused `companionFrameSizing` field is dropped from the deck's persisted state (stripped by the existing migration).
- 499dde4: Move the `WithProperties` test helper from `@dxos/plugin-markdown/testing` to a new `@dxos/app-toolkit/testing` subpath export.

### Patch Changes

- 5b05d75: Resolve an object's canonical navigation path through `NavigationOperation.ResolveNavigationTargets`, so opening an object from a generic surface (a card, a search result, an agent following a reference) lands where the nav tree shows it — its collection, or its type's sidebar section — instead of the hidden database path every object falls back to. This also fixes the nav tree showing no selection for objects opened from cards.
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
- 717edc0: `ProgressMeter` now shows a live elapsed-time readout for indeterminate tasks (no known total) instead of a perpetually-pulsing bar; the fractional bar and remaining-time ETA render only when a total is known.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
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
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [d547045]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/keyboard@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/i18n@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/progress@0.11.0
