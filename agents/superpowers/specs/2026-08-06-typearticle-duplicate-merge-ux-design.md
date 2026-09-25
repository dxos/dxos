# TypeArticle duplicate-merge UX — inline staged merge

Date: 2026-08-06
Package: `@dxos/plugin-space`
Status: approved (approach 1; participating cards fold into a single result card — review after implementation; auto-advance after confirm; result card read-only, editable only in the companion)

## Problem

The duplicates review in `TypeArticle` stages a merge into the `Selected` companion
(`SelectedObjectsSurface` → `MergePreview`), which has two defects:

1. Confirm/Cancel live only in the companion, so a merge cannot complete unless the
   companion plank is open — a multi-screen flow for a one-decision action.
2. `handleMerge` (`duplicatesGroup.tsx`) builds the preview from the whole current
   group (`duplicates.current`), ignoring the user's card selection.

## Design

The merge is staged, previewed, confirmed, and cancelled entirely within `TypeArticle`.
The companion becomes an optional, richer view of the same staged preview (an editable
form), with no toolbar of its own.

### Selection-aware staging

`handleMerge` intersects the shared selection (`useSelection(typeUri)`) with the current
group's members:

- ≥2 selected members of the group → merge only those.
- Otherwise → merge the whole group (current behavior).

The staged `MergePreview.objectIds` records the actual participants. The
`SpaceCapabilities.MergePreview` shape is unchanged.

### Staged state in TypeArticle

While `ephemeral.mergePreview?.typeUri === typeUri` and the duplicates layout is active:

- **Grid**: the participating cards are replaced by one highlighted "merged result"
  card rendering the detached `preview` object — read-only: no selection toggle, no
  delete, no open; styled as current (`dx-current`). Non-participating group members
  stay visible as normal cards.
- **Toolbar**: the duplicates subgraph swaps Merge/Skip for **Confirm** (primary) and
  **Cancel**. Rescan and the position arrows remain and keep their existing behavior
  of clearing the staged preview. Confirm is disabled while the merge operation runs.

### Confirm / Cancel

Confirm moves from `MergePreview` into the duplicates toolbar
(`duplicatesGroup.tsx`): invoke `SpaceOperation.MergeDuplicates` with
`{ typename, objectIds, overrides: preview }`, and on success clear `mergePreview` and
bump `lastMergeAt`. The bump triggers the existing rescan effect in `useDuplicates`,
which re-seeds to group 0 — the auto-advance. On error the preview stays staged (the
merge did not happen). Cancel clears `mergePreview` only.

On success the participants are also removed from the shared selection, so the
companion's card stack does not hold stale ids.

`duplicatesGroup` needs `spaceId` (new option, passed from `TypeArticle`).

### Companion (`MergePreview.tsx`)

Loses its Confirm/Cancel toolbar; keeps the editable `ObjectForm` over the staged
detached preview. Edits mutate the detached object, so they still flow into the
`overrides` at confirm time. `SelectedObjectsSurface` routing is unchanged.

## Files

- `containers/TypeArticle/duplicatesGroup.tsx` — selection-aware `handleMerge`;
  staged-state toolbar swap; confirm/cancel handlers (merge invoke moves here);
  `spaceId` + `selectedIds` options.
- `containers/TypeArticle/TypeArticle.tsx` — read `mergePreview` from
  `EphemeralState`; compute staged tile list (result card + non-participants);
  read-only preview tile variant; pass selection into the group hook.
- `containers/MergePreview/MergePreview.tsx` — drop the toolbar and the merge invoke;
  render the form only.
- `containers/TypeArticle/TypeArticle.stories.tsx` — cover the staged state and the
  selection-subset merge.
- Translations (`translations.ts`) — confirm/cancel labels already exist
  (`confirm-merge.label`, `cancel-merge.label`); reuse.

## Error handling

- Merge operation error: keep the preview staged, `log.warn` (existing behavior,
  relocated).
- Selection drift while staged: the staged preview is a snapshot; changing selection
  does not restage. Navigation/rescan clears it (existing behavior).
- Group member deleted elsewhere while staged: `MergeDuplicates` already receives
  explicit `objectIds`; the operation's own handling applies, unchanged.

## Testing

- Storybook: staged-merge story (all members) and selection-subset story; verify
  toolbar swap, result card, confirm advances, cancel restores.
- `moon run plugin-space:build` + existing tests; format before commit.

## Out of scope

- Collapsed/ghosted rendering of the folded input cards (review after this lands).
- Editing the result card inline in the grid.
- Changes to `planMerge` / `MergeDuplicates` semantics.
