# @dxos/plugin-inbox

## 0.11.0

### Minor Changes

- 48d168e: Gmail and JMAP sync are now always bidirectional and durably resumable: the sync cursor tracks a `max`/`min` watermark pair (replacing `value`), each run syncs new mail forward and continues backfilling backward in the same pass, and a per-run message cap requests a durable re-run via `Operation.runAgain()` instead of looping in-process. The sync operations now take only the binding — the `direction`/`after`/`before` inputs are removed. Breaking: the `Cursor` schema field `value` becomes the `max`/`min` pair, `Cursor.resolveWindow` is replaced by `Cursor.resolveHorizon`/`Cursor.resolveWindows`, `Cursor.dedupStage` drops its `direction` option, and `Cursor.advance`/`Cursor.parseKey`/`Cursor.formatKey` operate on `max` instead of `value`.
- 2a68c3b: The conversation view (`MessageArticle`) now renders threads as a Mosaic stack: each message is a tile with its own toolbar, so Reply/Reply All/Forward/AI reply/Delete act on that specific message rather than always targeting the newest one. Body view controls (view mode, load remote images) and collapse-all/expand-all move to a single thread toolbar that applies to the whole conversation, and each message can be individually collapsed to a compact summary. The per-message `Message.Toolbar` no longer includes the view-mode switcher or load-images toggle.

  By default only the most recent message is expanded and the rest are collapsed. Replying to a message now records the specific message it answers (`parentMessage`), so the draft renders directly after that message in the thread rather than always at the bottom, and it is smoothly scrolled fully into view.

  `Listbox.Item` rows with an `onClick` (not just selectable ones) are now keyboard-focusable and respond to Enter/Space, matching native `<button>` activation.

- 30ae5eb: Add stable `data-testid`s across the inbox and connector UI (mailbox sync/reply/message actions, message and conversation tiles, connect dropdown) and an optional `testId` param on `AppNode.makeToolbarActionGroup` / `react-ui-menu`'s menu builder, enabling reliable browser-e2e targeting.
- 2543b63: Mail sync is now incremental and provider system state maps onto shared canonical tags.

  Incremental delta-resume: the sync cursor carries an opaque provider delta token (Gmail `historyId`, JMAP `Email/get` state). After the initial window backfill, each run fetches only the delta since the token (Gmail `history.list` — paginated so multi-page deltas are not dropped; JMAP `Email/changes`), applying additions plus label/flag reconciliation to already-committed feed messages via objectless commit units. A stale token falls back to the window scan and recaptures; the token advances only after the run's merged stream fully drains, so a crash re-fetches the delta idempotently.

  Unified system tags: Gmail system labels, JMAP mailbox roles, and the JMAP `$flagged` keyword now resolve to a shared, provider-agnostic tag registry (`org.dxos.tag`: starred / inbox / important / sent / and the Gmail categories) instead of provider-scoped tags — so a Gmail star, a JMAP flag, and a locally-toggled star are the same tag. Read-state, drafts, trash, spam, and archive are intentionally not tagged (archive is derived as "not in inbox"). The starred tag's foreign key moves from `org.dxos.org` to `org.dxos.tag`; existing locally-starred items under the old key are not migrated.

- 33e1a3d: Bring JMAP mail sync to feature parity with Gmail — live progress monitor with cancellation, stats-panel telemetry, and failure reporting — and drive both providers through one shared, provider-agnostic sync effect (`runMailSync`) that takes its provider as an Effect service, so each handler is the same run with its own provider layer (API + resolver) provided.
- a2447cd: Restructure the mailbox nav tree around an inbox-filtered default view, with All Mail, Sent, and Drafts as sibling views rendered through the same list and message companion; drafts now appear inline on their thread wherever it's already shown. Inbox and Sent resolve by the canonical system tag's identity, matching feed messages by the ids resolved from the mailbox's tag index rather than a query-level tag filter (which can't see tags on immutable feed messages) or label text, so both actually populate and stay correct across providers/locales. The sync and analyze-topics actions now appear on every one of a mailbox's views (previously only the primary node).

  Drafts is now a canonical system-tag view like Inbox/Sent, not a separate data path: a draft is tagged when composed and untagged the instant it sends, so the Drafts view is a plain tag-filtered query over the same aggregate/pagination pipeline as every other view, and a mailbox's in-flight drafts drop out of the "attach to thread" list the moment they're sent rather than waiting on the next sync. Every draft-creation path (new compose, inline reply/reply-all/forward, and the AI assistant's draft tool) applies the tag consistently. Composing a brand-new message now navigates to the Drafts view and selects the new draft, so its message companion opens immediately.

- 923d5be: Auto-create a recurring sync Routine when a mailbox or calendar is bound to a connection (new connection, multi-target selection, or reusing an existing connection); the toolbar "Sync" action force-runs it and disables while a sync is already in progress. Fixes a legacy-DXN compatibility gap in `refToEffectSchema` and a bug where cancelling a Gmail sync left its progress monitor stuck at "running".
- f0ec728: Promote `Topic` to a first-class domain type. `Topic` moves from `@dxos/pipeline-email` to `@dxos/types` as a Project-style class (inline title/label/icon annotations + `make` factory), keeping a shared `Topic.Props` struct and its `org.dxos.type.topic` DXN. The Topic detail view (`TopicArticle`) moves to `@dxos/plugin-brain` and renders via a regular object/article surface.

  Breaking: `Topic` / `TopicProps` are no longer exported from `@dxos/pipeline-email` — import from `@dxos/types` and use the namespace form (`Topic.Topic`, `Topic.Props`). No compatibility re-export is left behind.

- bb63d91: Clean up inbox operations: remove unused `DeleteEmail`, `DeleteEvent`, `SyncDraftEvents`, `SyncContacts` operations and the dead `tool-ids.ts` file. Deprecate `ExtractContact` and `ExtractMailbox`. Add a defensive double-click guard to toolbar action buttons — they now disable while the handler is in-flight.

### Patch Changes

- d958118: Inbox draft composer rebuilt as a compose-style form, plus the shared UI it needs. `@dxos/react-ui` `Input.TextInput` gains MUI-style `start`/`end` adornments rendered inside the input container; `@dxos/ui-theme` adds a shared `.dx-input` box treatment (surface + hairline border + focus-within shift) now used by Input, `MarkdownField`, `RefEditor`, and the inbox editor. `@dxos/react-ui-form` `RefEditor` email mode renders committed mailboxes as atomic tag widgets (trailing delete affordance, no `@` marker) — a raw address stays plain text until committed with comma/Space/Enter, typing before a tag starts a fresh token, and the single line is centered so text and tags align. `@dxos/ui-editor`'s `defaultThemeSlots` is now `fullWidth` (no longer forces `h-full`). `@dxos/plugin-inbox` `EditMessage` gains To/Cc/Bcc recipient pickers with Person autocomplete, arrow-key field navigation, and a layout fix so Send no longer overlaps the editor.
- 3b4a7c8: The inbox message view selector (HTML / Markdown / Plain) now persists across messages and sessions. The choice is stored alongside the other inbox settings (the `loadRemoteImages` toggle) in the plugin's settings store, so it survives reloads instead of resetting to HTML on every open. Also reorganizes `useArticleKeyboardNavigation` under `AttentionProvider` (no change to the `@dxos/react-ui-attention` public exports).
- 6dd1aa8: Mailbox UX fixes: the Gmail sync progress meter now shows a determinate bar (the retrieval total is known once message ids are enumerated); the Topics and Subscriptions articles use the standard `Panel.Toolbar` menu idiom and render their lists (and topic suggestions) via `react-ui-mosaic` `Stack`; selecting a topic opens `TopicArticle` in the companion; the `Topic` type now has a navtree name; and the one-click unsubscribe POST no longer triggers a CORS console error.
- 9cde1c6: `usePagination`'s `isLoading` now reflects genuine query settlement instead of clearing on the next microtask regardless of delivery, so consumers can reliably distinguish "still loading" from "loaded and empty" even for async, feed-backed queries. The mailbox article uses this to fix a bug where it could briefly flash the wrong empty-state message (e.g. "No connections configured") while a large mailbox's messages were still loading.
- 0afbf15: Fix mailbox paging and the list blanking during sync. `usePagination` now keeps the previously-shown page across a query-identity change instead of resetting to empty + loading, and the virtualizer pagination hook re-arms `getNext` after a page lands and no longer misreads a reordered item as an eviction. The mailbox renders a loading spinner in-flow at the end of the list rather than replacing the whole panel.
- 1a989ed: Graph actions can now declare `disposition` as an array and a `presentation` chrome override per surface, letting one action multi-target the object toolbar and nav-tree context menu with appropriate chrome in each. Mailbox and calendar "Sync" now surface from a single graph action instead of a duplicated toolbar button.
- cb14d6e: Fix auto-created mailbox/calendar sync triggers so their `input` carries only `binding`, matching the sync operation's input schema. The trigger no longer smuggles an extra `mailbox`/`calendar` ref into the operation input; the routine is instead discovered through its `binding` cursor's `spec.target`.
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [31fe0b8]
- Updated dependencies [46ec569]
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [a31ef40]
- Updated dependencies [eec72c5]
- Updated dependencies [e510f3b]
- Updated dependencies [1a9bca1]
- Updated dependencies [68e61ca]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [b602d44]
- Updated dependencies [6439417]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [6d2afe0]
- Updated dependencies [9cde1c6]
- Updated dependencies [0d1f866]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [801b77f]
- Updated dependencies [1a989ed]
- Updated dependencies [aea1e6e]
- Updated dependencies [717edc0]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [96109be]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [a49131a]
- Updated dependencies [31fe0b8]
  - @dxos/echo@0.11.0
  - @dxos/plugin-markdown@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/async@0.11.0
  - @dxos/link@0.11.0
  - @dxos/plugin-connector@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/client@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/extractor@0.11.0
  - @dxos/extractor-lib@0.11.0
  - @dxos/pipeline-email@0.11.0
  - @dxos/pipeline-rdf@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/echo-query@0.11.0
  - @dxos/plugin-preview@0.11.0
  - @dxos/plugin-routine@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/react-ui-card@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/react-ui-table@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/react-ui-calendar@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/react-ui-rdf@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-settings@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/random@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/markdown@0.11.0
