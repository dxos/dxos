# Fragment Definitions Audit

External packages importing fragment definitions from `ui-theme/src/fragments`.

## Current Fragment Exports

| File          | Definition                            | External | Internal |
| ------------- | ------------------------------------- | -------- | -------- |
| `density.ts`  | `densityBlockSize`                    | -        | 1        |
| `density.ts`  | `coarseBlockSize`                     | -        | 1        |
| `density.ts`  | `coarseDimensions`                    | -        | 1        |
| `density.ts`  | `fineBlockSize`                       | -        | 1        |
| `density.ts`  | `fineDimensions`                      | -        | 1        |
| `disabled.ts` | `staticDisabled`                      | -        | 1        |
| `disabled.ts` | `dataDisabled`                        | -        | 1        |
| `focus.ts`    | `focusRing`                           | 2        | 5        |
| `focus.ts`    | `subduedFocus`                        | -        | 2        |
| `focus.ts`    | `staticFocusRing`                     | -        | 1        |
| `hover.ts`    | `subtleHover`                         | 4        | -        |
| `hover.ts`    | `ghostHover`                          | 8        | 2        |
| `hover.ts`    | `ghostFocusWithin`                    | 1        | -        |
| `hover.ts`    | `hoverableControls`                   | 9        | -        |
| `hover.ts`    | `groupHoverControlItemWithTransition` | 2        | -        |
| `hover.ts`    | `hoverableFocusedKeyboardControls`    | 1        | -        |
| `hover.ts`    | `hoverableFocusedWithinControls`      | 9        | -        |
| `hover.ts`    | `hoverableOpenControlItem`            | 3        | -        |
| `hover.ts`    | `hoverableControlItem`                | 7        | -        |
| `text.ts`     | `descriptionTextPrimary`              | 1        | -        |
| `text.ts`     | `descriptionMessage`                  | 5        | -        |

## Summary

**Total fragments:** 21
**Total imports (external + internal):** 96
- **External:** 63
- **Internal:** 33

**Most imported overall:**
- `hoverableControls` (9 external)
- `hoverableFocusedWithinControls` (9 external)
- `ghostHover` (8 external + 2 internal = 10 total)
- `hoverableControlItem` (7 external)
- `focusRing` (2 external + 5 internal = 7 total)

**Internal imports by file:**
- `input.ts`: 8 definitions (coarseBlockSize, coarseDimensions, fineBlockSize, fineDimensions, focusRing, staticDisabled, staticFocusRing, subduedFocus)
- `list.ts`: 3 definitions (densityBlockSize, focusRing, ghostHover)
- `menu.ts`: 2 definitions (dataDisabled, subduedFocus)
- `button.ts`, `link.ts`, `popover.ts`, `toast.ts`: 1 definition each (ghostHover, focusRing, focusRing, focusRing)

**Completely unused:** 7 fragments
- `subtleHover` from `hover.ts`
- `hoverableOpenControlItem`, `groupHoverControlItemWithTransition` from `hover.ts` (only 2-3 uses)
- `descriptionTextPrimary` from `text.ts` (only 1 use)
