# Fragment Definitions Audit

External packages importing fragment definitions from `ui-theme/src/fragments`.

**Note:** After merging `burdon/icon-size`, the following have been moved to `util/`:
- `elevation.ts` → `util/elevation.ts`
- `size.ts` → `util/size.ts`
- `valence.ts` → `util/valence.ts`

## Remaining in `fragments/`

### `density.ts`
- `densityBlockSize` — *not found in grep*
- `coarseBlockSize` — *not found in grep*
- `fineDimensions` — *not found in grep*

### `disabled.ts`
- `staticDisabled` — *not found in grep*
- `dataDisabled` — *not found in grep*

### `focus.ts`
- `focusRing` — 2 imports
- `subduedFocus` — *not found in grep*
- `staticFocusRing` — *not found in grep*

### `hover.ts` (most imported)
- `ghostHover` — 7 imports
- `subtleHover` — 4 imports
- `hoverableControls` — 8 imports
- `hoverableControlItem` — 7 imports
- `hoverableFocusedWithinControls` — 8 imports
- `hoverableOpenControlItem` — 3 imports
- `groupHoverControlItemWithTransition` — 2 imports

### `text.ts`
- `descriptionMessage` — 5 imports
- `descriptionTextPrimary` — 1 import

## Moved to `util/`

### `elevation.ts` (now `util/elevation.ts`)
- `surfaceShadow` — 2 imports
- `surfaceZIndex` — 1 import

### `size.ts` (now `util/size.ts`)
- `getSize` — 12 imports
- `iconSize` — 5 imports

### `valence.ts` (now `util/valence.ts`)
- `textValence` — 1 import
- `messageValence` — 1 import

## Summary

**Most commonly imported (in fragments):**
1. `hoverableControls` & `hoverableFocusedWithinControls` (8 each)
2. `ghostHover` & `hoverableControlItem` (7 each)

**Unused fragments:**
- All exports from `density.ts` and `disabled.ts`
- Most from `focus.ts` except `focusRing`
