# CRX Picker → Page Actions Migration

**Date**: 2026-06-11
**Status**: Approved

## Goal

The composer-crx "Clip" picker currently delivers a hardcoded-kind `Clip` (person / organization / note) over its own `composer:clip` window-event channel, handled only by plugin-crx. Bookmarks are created through a separate, plugin-extensible page-actions channel. This change unifies them: the picker toolbar becomes registry-driven, picked content travels as a `PageAction.Snapshot` over the existing `composer:page-action:invoke` channel, and plugin-bookmarks' `AddFromSnapshot` operation creates a bookmark from the picked element's extracted text. The legacy clip channel is removed entirely.

## Background

Two flows exist today:

- **Clip flow** (hardcoded): popup "Clip" → DOM picker (`packages/apps/composer-crx/src/picker/`) → user chooses a kind from `CLIP_KINDS` → `Clip` envelope → background `deliverClip` → `composer:clip` CustomEvent → plugin-crx `installClipListener` → `mapClip()` → Person / Organization / Markdown. The kind list is duplicated in four places (extension `ClipKind` union, `CLIP_KINDS`, plugin-crx `mapClip`, plugin-crx `Clip.SUPPORTED_KINDS`).
- **Page-actions flow** (plugin-extensible): plugins contribute serializable descriptors (`id`, `label`, `icon`, `urlPatterns`, `extractor`, `contexts`, `operation`) via the `CrxCapabilities.PageAction` capability. The extension fetches and caches the registry (`chrome.storage`), and invokes actions over `composer:page-action:invoke` with extracted inputs. plugin-bookmarks contributes "Add bookmark" backed by `BookmarkOperation.AddFromSnapshot`.

## Design

### 1. Protocol changes (both mirrors, in lockstep)

Files: `packages/plugins/plugin-crx/src/types/PageAction.ts` and `packages/apps/composer-crx/src/page-actions/types.ts`.

- Add `'picker'` to the `Context` literal (`'popup' | 'page' | 'selection' | 'link' | 'picker'`).
- Add `'picker'` to `InvokeRequest.invokedFrom` (`'popup' | 'contextMenu' | 'picker'`).
- Move the `Source`, `Selection`, and `Hints` schemas from `plugin-crx/src/types/Clip.ts` into `PageAction.ts` (they describe the Snapshot, which outlives the Clip envelope). Delete `Clip.ts` (envelope, kinds, ack, `composer:clip` event names) and its extension mirror `composer-crx/src/clip/types.ts`.

### 2. Extension: registry-driven picker (composer-crx)

- `picker/kinds.ts` (`CLIP_KINDS`) is deleted. `startPicker()` takes the list of toolbar entries (`{ id, label, icon }`) as a parameter; the picker resolves with `{ status: 'picked', element, actionId }`.
- `pickSnapshot()` (replacing `pickAndHarvest()`) reads the cached page-actions registry from `chrome.storage`, filters to actions whose `contexts` include `'picker'` and whose `urlPatterns` match the current URL, and passes them to the picker toolbar. Empty list → the picker does not start; a transient in-page notice tells the user to open Composer first (the registry populates when a Composer tab announces ready).
- On pick, the content script builds a `Snapshot` directly from the picked element:
  - `source`: `{ url, title, favicon (harvestFavicon), clippedAt }`
  - `selection`: `harvestSelection(element)` (text, html, htmlTruncated, rect)
  - `hints`: `harvestHints(document)`
- Delivery: new background runtime message (e.g. `composer-crx:page-action:deliver`) carrying `{ actionId, snapshot, page }`, replacing `composer-crx:deliver-clip`. The background handler:
  1. `enrichSnapshotWithThumbnail(snapshot)` (existing).
  2. Builds an `InvokeRequest` with `invokedFrom: 'picker'` and calls the existing `deliverInvoke()` (retry + open-Composer-tab logic unchanged).
  3. Notifies on failure via `browser.notifications` (same UX as the current clip flow; the popup is already closed).
- Developer-mode debug preview (`picker/debug-preview.ts`) is kept, now rendering the Snapshot JSON + chosen actionId before delivery.
- Deleted: `src/clip/` (types, pipeline, index), `deliverClip`/`DeliverResult`/clip message types in `bridge/sender.ts` (keep `findComposerTab`, `openComposerTab`), the clip bridge listener in `content.ts`, the `composer-crx:deliver-clip` handler in `background.ts`.

### 3. plugin-bookmarks

- Add `'picker'` to the contexts of the existing `add-bookmark` page action (`src/capabilities/page-action.ts`).
- Flip `excerpt` precedence in `Bookmark.fromSnapshot`: `selection.text` (explicit user intent — only present when the user selected or picked something) wins over `hints.ogDescription`, which becomes the fallback. Without this, the picked extract would be ignored on any page that declares an og:description.

### 4. plugin-crx: person / org / note become picker actions

- New operations (in `plugin-crx`, alongside the existing types): `AddPersonFromSnapshot`, `AddOrganizationFromSnapshot`, `AddNoteFromSnapshot` — each `{ snapshot: PageAction.Snapshot, target: Database } → { id }`, implemented by retyping the existing `mapping.ts` functions from `Clip.Clip` to `PageAction.Snapshot` (selection is optional on Snapshot; mappers guard) and invoking `SpaceOperation.AddObject`, mirroring `plugin-bookmarks/src/operations/add-from-snapshot.ts`.
- Contribute three page actions with `contexts: ['picker']`, `urlPatterns: ['http://*/*', 'https://*/*']`, `extractor: { name: 'snapshot' }` (required by the descriptor schema; unused in the picker flow, and correct if the actions are later surfaced in the popup). Labels/icons carried over from `CLIP_KINDS` (Person `ph--user--regular`, Organization `ph--building-office--regular`, Note `ph--note--regular`).
- Deleted: `listener.ts` (`installClipListener`, `handleClipEvent`), `capabilities/install-clip-listener.ts` (and its registration in `plugin.ts` / `capabilities/index.ts`), `types/Clip.ts`. Any clip-specific toast/feedback component is removed; user feedback now comes from the page-actions listener's existing `onResult` (action label) path.

### 5. Ordering / toolbar UX

The picker toolbar shows actions in registry order, then Cancel. plugin-crx contributes person/org/note; plugin-bookmarks contributes bookmark. Order across plugins is activation order — acceptable; no explicit ordering mechanism is added (YAGNI).

## Error handling

- Registry empty or no picker-context actions match the URL: toolbar renders only Cancel. The registry refreshes on background startup and whenever a Composer tab announces ready, and persists in `chrome.storage`, so this is a first-run-only state.
- Delivery failures (`no Composer tab`, timeout, operation error): browser notification, identical to current clip-flow behavior.
- Composer-side: `handleInvokeEvent` already returns stable error codes (`unknownAction`, `noSpace`, `operationFailed`); no changes needed.

## Accepted trade-offs

- Picker actions are unavailable until the registry has been populated once (previously person/org/note were compile-time constants). Mitigated by the persistent cache.
- Bookmark `excerpt` remains truncated to 280 chars; the full extracted text is not persisted.
- Person/org/note actions are picker-only (`contexts: ['picker']`) to preserve the current popup UX.
- The `version` field of the Clip envelope disappears; the page-actions protocol has its own versioned envelope.

## Testing

All runnable locally via moon (`moon run composer-crx:test`, `moon run plugin-crx:test`, `moon run plugin-bookmarks:test`):

- **composer-crx**: extend `page-actions/types.test.ts` (new context / invokedFrom decoding), `invoke.test.ts` (picker-originated delivery), add coverage for the picked-element → Snapshot builder and registry filtering (contexts + urlPatterns); update/remove picker tests referencing `CLIP_KINDS`.
- **plugin-crx**: retype `mapping.test.ts` to Snapshot inputs (including missing `selection`); replace clip-listener tests with operation-handler tests for the three new operations; extend `page-actions.test.ts` for `'picker'` context round-trip.
- **plugin-bookmarks**: existing `AddFromSnapshot` tests unchanged; add descriptor assertion for the `'picker'` context.
- Manual end-to-end (load unpacked extension, pick an element, verify bookmark appears in the active space) is deferred to the user at final verification; everything else is automated.
