# Refactor

We are refactoring `plugin-search` and `react-ui-search`.
Think deeply and plan this task.
Look closely at `plugin-inbox` and use `EventStack` and `MessagesStack` as exemplars.
At the end of each phase, commit and push all edits then monitor the CI and address all PR comments.
Use this document to record any decisions made during the implementation, potential issues, or suggestions.

## Phase 1

- [x] Create a low-level component `SearchStack` similar to `EventStack`,
  - [x] Create default SearchTile that displays a basic Card with Header and Title.
  - [x] Create a storybook.
- [x] `SearchMain` should contain `Panel.Root` like `MailboxArticle`
  - [x] `SearchResultTile` should wrap Tile similar to `MessageTile` but should remain in `plugin-search` since it uses Surface.
  - [x] Rename `SearchMain` to `SearchArticle`.
  - [x] Create a storybook.

### Implementation Notes

- `SearchResult` type moved from `plugin-search/src/types` to `react-ui-search/src/types/`.
  - `plugin-search` re-exports it for backward compatibility (plugin-explorer imports it from there).
  - `react-ui-search` now depends on `@dxos/echo` (for `Entity.Unknown` in the type) and `@dxos/react-ui-mosaic`.
- `SearchStack` (in `react-ui-search`) follows the exact EventStack pattern: `composable` + `Mosaic.Container` + `Focus.Group` + `VirtualStack`.
  - Default `SearchTile` renders a simple `Card.Toolbar` with title and optional snippet.
- `SearchArticle` (in `plugin-search`) composes `SearchList.Root` + `Panel.Root` directly (does not use `SearchPanel`).
  - `SearchResultTile` wraps `Mosaic.Tile` + `Focus.Item` and uses `Surface.Surface` for rich object rendering.
  - The `SearchList.Input` is in `Panel.Statusbar` (same position as `SearchPanel` had it).
- `SearchPanel` and `SearchList` are left untouched for Phase 2 work.

### Suggestions for Phase 2

- `SearchArticle` currently still uses `SearchList.Root` for the search input debouncing. Once `SearchPanel` is simplified for mobile-only, consider whether `SearchArticle` should use a standalone search input hook instead.
- The `SearchStack` component is not yet used by `SearchArticle` — the article has its own inline `SearchResultStack` that wraps `Mosaic.VirtualStack` because the tile uses Surface. Consider whether `SearchStack` should accept a custom `Tile` prop to allow reuse.
- `useWebSearch` is deprecated and could be removed in Phase 2.

## Phase 2

- [ ] Evolve `SearchPanel` to be a generic list container for mobile only.
- [ ] Reconcile `react-list`, `react-ui-list` and `react-ui-mosaic`.
  - Simplify `react-ui-list` (remove draggable).
  - Add key nav via tabster.
