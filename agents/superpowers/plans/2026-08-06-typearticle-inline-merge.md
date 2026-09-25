# TypeArticle Inline Duplicate-Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the duplicates merge entirely within `TypeArticle` — selection-aware staging, Confirm/Cancel in the article toolbar, a read-only merged-result card in the grid — with the companion reduced to an optional editable form.

**Architecture:** The staged `mergePreview` in `SpaceCapabilities.EphemeralState` stays the single source of truth. `useDuplicatesGroup` gains the confirm path (moved from `MergePreview`) and swaps its Merge/Skip actions for Confirm/Cancel while staged. `TypeArticle` renders the staged preview as a read-only tile in place of the participating cards. `MergePreview` (companion) loses its toolbar.

**Tech Stack:** React 18, `@dxos/react-ui-menu` MenuBuilder, `@dxos/app-framework` atoms/operations, Storybook for verification.

**Spec:** `agents/superpowers/specs/2026-08-06-typearticle-duplicate-merge-ux-design.md`

## Global Constraints

- No casts (`as any`, non-null `!`); no wrapper divs; comments say _why_, once.
- Reuse translation keys `confirm-merge.label` / `cancel-merge.label` (exist in `translations.ts:340-341`).
- `pnpm format` before every commit.
- All paths relative to `packages/plugins/plugin-space/`.

---

### Task 1: Selection-aware staging + Confirm/Cancel in `useDuplicatesGroup`

**Files:**

- Modify: `src/containers/TypeArticle/duplicatesGroup.tsx`

**Interfaces:**

- Consumes: `SpaceOperation.MergeDuplicates`, `SpaceCapabilities.EphemeralState`, `buildMergePreview` (unchanged).
- Produces: `UseDuplicatesGroupOptions` gains `spaceId: SpaceId`, `selectedIds: string[]`, `onConfirmed?: (objectIds: string[]) => void`. Task 2 passes these from `TypeArticle`.

- [ ] **Step 1: Rewrite the hook**

New/changed parts (imports: add `useState`, `SpaceId` from `@dxos/keys`, `log` from `@dxos/log`, `useOperationInvoker` from `@dxos/app-framework/ui`, `SpaceOperation` from `../../operations`):

```tsx
export type UseDuplicatesGroupOptions = {
  /** URI of the type under review; scopes the staged preview to this article. */
  typeUri: string;
  typename: string;
  spaceId: SpaceId;
  /** Shared selection; a ≥2-member subset of the current group narrows the merge to it. */
  selectedIds: string[];
  duplicates: UseDuplicatesResult;
  /** Called after a confirmed merge with the ids merged away, so the caller can drop them from the selection. */
  onConfirmed?: (objectIds: string[]) => void;
};
```

In the hook body:

```tsx
const [ephemeral, updateEphemeral] = useAtomCapabilityState(SpaceCapabilities.EphemeralState);
const { invokePromise } = useOperationInvoker();
const staged = ephemeral.mergePreview?.typeUri === typeUri ? ephemeral.mergePreview : undefined;
// The merge removes objects, so a second click would re-run it against ids the first call has
// already deleted. Confirm is disabled for the duration.
const [merging, setMerging] = useState(false);
```

`handleMerge` becomes selection-aware:

```tsx
const handleMerge = useCallback(() => {
  const selected = current.filter((object) => selectedIds.includes(object.id));
  const participants = selected.length >= 2 ? selected : current;
  const preview = buildMergePreview(spec, participants);
  if (!preview) {
    return;
  }
  updateEphemeral((state) => ({
    ...state,
    mergePreview: { typeUri, typename, objectIds: participants.map((object) => object.id), preview },
  }));
}, [updateEphemeral, spec, current, selectedIds, typeUri, typename]);
```

Confirm (logic moved from `MergePreview.tsx`, including its comments):

```tsx
const handleConfirm = useCallback(() => {
  if (!staged) {
    return;
  }
  setMerging(true);
  void invokePromise(
    SpaceOperation.MergeDuplicates,
    { typename: staged.typename, objectIds: staged.objectIds, overrides: staged.preview },
    { spaceId },
  )
    .then(({ error }) => {
      if (error) {
        // Leave the preview up: the merge did not happen, and clearing it would look like it did.
        log.warn('merge failed', { error });
        return;
      }
      // Bumping the timestamp is what tells the open review to rescan; without it the group the
      // user just merged stays on screen as a one-member "duplicate".
      updateEphemeral((state) => ({ ...state, mergePreview: undefined, lastMergeAt: Date.now() }));
      onConfirmed?.(staged.objectIds);
    })
    .finally(() => setMerging(false));
}, [staged, invokePromise, spaceId, updateEphemeral, onConfirmed]);
```

Builder: while staged, Confirm/Cancel replace Merge/Skip; rescan and the arrows keep their existing clear-preview behavior:

```tsx
return useMemo(
  () => (builder) => {
    if (staged) {
      builder
        .action(
          'confirm-merge',
          {
            label: ['confirm-merge.label', { ns: meta.profile.key }],
            icon: 'ph--check--regular',
            variant: 'primary',
            iconOnly: false,
            disabled: merging,
          },
          handleConfirm,
        )
        .action(
          'cancel-merge',
          {
            label: ['cancel-merge.label', { ns: meta.profile.key }],
            iconOnly: false,
            disabled: merging,
          },
          clearPreview,
        );
    } else {
      builder.action('merge', {/* unchanged */}, handleMerge).action('skip', {/* unchanged */}, handleAdvance);
    }
    builder.action('rescan', {/* unchanged */}, handleRefresh).subgraph(/* arrows + counter, unchanged */).separator();
  },
  [
    staged,
    merging,
    current.length,
    position,
    total,
    scanning,
    handleMerge,
    handleConfirm,
    clearPreview,
    handleAdvance,
    handlePrevious,
    handleRefresh,
  ],
);
```

(`/* unchanged */` = keep the existing action descriptors verbatim.)

- [ ] **Step 2: Build**

Run: `moon run plugin-space:build` (expect a type error in `TypeArticle.tsx` for the new required options — resolved in Task 2; if so, proceed).

- [ ] **Step 3: Commit** (after Task 2 makes the package build — Tasks 1+2 are one commit)

---

### Task 2: Staged-state grid in `TypeArticle`

**Files:**

- Modify: `src/containers/TypeArticle/TypeArticle.tsx`

**Interfaces:**

- Consumes: Task 1's `UseDuplicatesGroupOptions` (`spaceId`, `selectedIds`, `onConfirmed`); `SpaceCapabilities.EphemeralState`.
- Produces: `TileData` with optional `onSelect`/`onOpen` (read-only preview tile).

- [ ] **Step 1: Read the staged preview and wire the group hook**

Add imports: `useAtomCapability` from `@dxos/app-framework/ui`, `* as SpaceCapabilities from '../../types/SpaceCapabilities'`.

```tsx
const { mergePreview } = useAtomCapability(SpaceCapabilities.EphemeralState);
const stagedPreview = mergePreview?.typeUri === typeUri ? mergePreview : undefined;

const handleConfirmed = useCallback(
  (objectIds: string[]) => setSelectedObjects(selectedIds.filter((id) => !objectIds.includes(id))),
  [setSelectedObjects, selectedIds],
);

const duplicatesGroup = useDuplicatesGroup({
  typeUri,
  typename: Type.getTypename(type),
  spaceId: space.id,
  selectedIds,
  duplicates,
  onConfirmed: handleConfirmed,
});
```

- [ ] **Step 2: Read-only preview tile**

Make `TileData` callbacks optional and swap the tile list while staged:

```tsx
type TileData = {
  object: Obj.Unknown;
  current: boolean;
  onSelect?: (id: string) => void;
  onOpen?: (object: Obj.Unknown) => void;
  onDelete?: (object: Obj.Unknown) => void;
};
```

```tsx
const tiles = layout === 'duplicates' ? duplicates.current : results;
const tileItems = useMemo<TileData[]>(() => {
  // While a merge is staged the participants fold into one read-only result card; members the
  // selection excluded stay behind as normal cards.
  if (layout === 'duplicates' && stagedPreview) {
    const participants = new Set(stagedPreview.objectIds);
    return [
      { object: stagedPreview.preview, current: true },
      ...tiles
        .filter((object) => !participants.has(object.id))
        .map((object) => ({
          object,
          current: selectedIds.includes(object.id),
          onSelect: toggleSelected,
          onOpen: handleOpen,
          onDelete: Obj.getParent(object) ? undefined : handleDelete,
        })),
    ];
  }
  return tiles.map((object) => ({/* existing mapping, unchanged */}));
}, [layout, stagedPreview, tiles, selectedIds, toggleSelected, handleOpen, handleDelete]);
```

In `ObjectTile`: `handleCurrentChange` calls `onSelect?.(object.id)`; the `open` menu item is emitted only when `onOpen` is present (same pattern as the existing `onDelete` guard). The card keeps `dx-current` styling via `current`; drop the `cursor-pointer` class when `onSelect` is absent.

The detached preview has no database identity, so the masonry `getId` must not call `Obj.getURI`; change both `Masonry.Viewport` usages to `getId={(data) => data.object.id}`.

- [ ] **Step 3: Build**

Run: `moon run plugin-space:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
pnpm format
git add -A
git commit -m "plugin-space: stage duplicate merges inline in TypeArticle"
```

---

### Task 3: Reduce the companion to a form

**Files:**

- Modify: `src/containers/MergePreview/MergePreview.tsx`
- Modify: `src/capabilities/SpaceSurfaces.tsx` (call site)
- Modify: `src/containers/TypeArticle/TypeArticle.stories.tsx` (`StoryCompanion` call site)

**Interfaces:**

- Produces: `MergePreviewProps = { type: Type.AnyEntity; preview: SpaceCapabilities.MergePreview }` (drops `spaceId`).

- [ ] **Step 1: Strip the toolbar and merge invoke**

`MergePreview.tsx` becomes (keep the copyright header):

```tsx
import React, { forwardRef } from 'react';

import { type Type } from '@dxos/echo';
import { Card, Panel, ScrollArea } from '@dxos/react-ui';
import { ObjectForm } from '@dxos/react-ui-form';

import * as SpaceCapabilities from '../../types/SpaceCapabilities';

export type MergePreviewProps = {
  type: Type.AnyEntity;
  preview: SpaceCapabilities.MergePreview;
};

/**
 * Companion view of a staged merge: an editable form over the *detached* merged object. Edits
 * mutate the detached preview, so they flow into the overrides when the article's Confirm commits.
 * Confirm/Cancel live in the TypeArticle toolbar that staged the preview.
 */
export const MergePreview = forwardRef<HTMLDivElement, MergePreviewProps>(({ type, preview }, forwardedRef) => (
  <Panel.Root ref={forwardedRef}>
    <Panel.Content asChild>
      <ScrollArea.Root orientation='vertical' centered>
        <ScrollArea.Viewport>
          <Card.Root fullWidth classNames='pb-form-gap'>
            <ObjectForm object={preview.preview} type={type} />
          </Card.Root>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  </Panel.Root>
));

MergePreview.displayName = 'MergePreview';
```

- [ ] **Step 2: Update call sites**

`SpaceSurfaces.tsx:152`: `<MergePreview type={companionTo} preview={mergePreview} ref={ref} />`.
`TypeArticle.stories.tsx:144`: `<MergePreview type={type} preview={mergePreview} />`.

- [ ] **Step 3: Build + lint**

Run: `moon run plugin-space:build && moon run plugin-space:lint`
Expected: PASS (lint catches any now-unused imports/translations references).

- [ ] **Step 4: Commit**

```bash
pnpm format
git add -A
git commit -m "plugin-space: companion MergePreview is a form only"
```

---

### Task 4: Story + live verification

**Files:**

- Modify: `src/containers/TypeArticle/TypeArticle.stories.tsx` (Duplicates story test script)

- [ ] **Step 1: Update the Duplicates story's numbered test script**

Rewrite steps 5-7 of the `Duplicates` story doc comment to match the new flow:

```
5. Press the left arrow to return to group 1, then select two of the three Alice cards and press
   Merge. The three cards collapse to two: a highlighted read-only result card (no menu) plus the
   unselected Alice; the toolbar now shows Confirm merge / Cancel; the companion shows the editable
   preview form.
6. Press Cancel — the three cards return. Press Merge with nothing selected: all three fold into
   one result card. Edit `nickname` in the companion form, then press Confirm merge in the article
   toolbar. The article rescans, the counter reads `1 / 1`, and only the Bob group remains.
7. Switch to the Cards tab. There are now six people, not eight: one Alice carrying every merged
   field plus your nickname edit.
```

- [ ] **Step 2: Run the story and walk the script**

Serve storybook from this worktree on a free port (NOT 9009 — that is the user's):

```bash
moon run storybook-react:serve -- --port 9010
```

Drive the `plugins/plugin-space/containers/TypeArticle` → `Duplicates` story with Playwright: run steps 1-7, and confirm zero console errors. Key assertions: Merge stages selection subset; Confirm lives in the article toolbar and completes without the companion; result card has no menu button; Cancel restores the group; rescan lands on `1 / 1`.

- [ ] **Step 3: Full gate**

```bash
moon run plugin-space:build && moon run plugin-space:lint && moon run plugin-space:test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
pnpm format
git add -A
git commit -m "plugin-space: update Duplicates story script for inline merge"
```
