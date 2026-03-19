# Fragment Definitions Audit

External packages importing fragment definitions from `ui-theme/src/fragments`.

**Note:** `elevation.ts`, `size.ts`, and `valence.ts` have been moved to `util/` on the `burdon/icon-size` branch.

## Current Fragment Exports

| File | Definition | External Imports |
|------|-----------|-----------------|
| `density.ts` | `densityBlockSize` | 0 |
| `density.ts` | `coarseBlockSize` | 0 |
| `density.ts` | `coarseDimensions` | 0 |
| `density.ts` | `fineBlockSize` | 0 |
| `density.ts` | `fineDimensions` | 0 |
| `disabled.ts` | `staticDisabled` | 0 |
| `disabled.ts` | `dataDisabled` | 0 |
| `focus.ts` | `focusRing` | 2 |
| `focus.ts` | `subduedFocus` | 0 |
| `focus.ts` | `staticFocusRing` | 0 |
| `hover.ts` | `subtleHover` | 4 |
| `hover.ts` | `ghostHover` | 7 |
| `hover.ts` | `ghostFocusWithin` | 0 |
| `hover.ts` | `hoverableControls` | 8 |
| `hover.ts` | `groupHoverControlItemWithTransition` | 2 |
| `hover.ts` | `hoverableFocusedKeyboardControls` | 0 |
| `hover.ts` | `hoverableFocusedWithinControls` | 8 |
| `hover.ts` | `hoverableOpenControlItem` | 3 |
| `hover.ts` | `hoverableControlItem` | 7 |
| `text.ts` | `descriptionTextPrimary` | 1 |
| `text.ts` | `descriptionMessage` | 5 |

## Summary

**Total fragments:** 21
**Unused fragments:** 15 (71%)
**Used fragments:** 6 (29%)

**Most imported:**
- `hoverableControls` (8)
- `hoverableFocusedWithinControls` (8)
- `ghostHover` (7)
- `hoverableControlItem` (7)

**Candidates for removal:**
- All exports from `density.ts` (5 unused)
- All exports from `disabled.ts` (2 unused)
- `subduedFocus`, `staticFocusRing` from `focus.ts`
- `ghostFocusWithin`, `hoverableFocusedKeyboardControls` from `hover.ts`
