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
| `hover.ts`    | `ghostHover`                          | 7        | 2        |
| `hover.ts`    | `ghostFocusWithin`                    | -        | -        |
| `hover.ts`    | `hoverableControls`                   | 8        | -        |
| `hover.ts`    | `groupHoverControlItemWithTransition` | 2        | -        |
| `hover.ts`    | `hoverableFocusedKeyboardControls`    | -        | -        |
| `hover.ts`    | `hoverableFocusedWithinControls`      | 8        | -        |
| `hover.ts`    | `hoverableOpenControlItem`            | 3        | -        |
| `hover.ts`    | `hoverableControlItem`                | 7        | -        |
| `text.ts`     | `descriptionTextPrimary`              | 1        | -        |
| `text.ts`     | `descriptionMessage`                  | 5        | -        |

## Summary

**Total fragments:** 21
**Total imports (external + internal):** 114
- **External:** 81
- **Internal:** 33

**Most imported overall:**
- `focusRing` (2 external + 5 internal = 7 total)
- `ghostHover` (7 external + 2 internal = 9 total)
- `hoverableControls` (8 external)
- `hoverableFocusedWithinControls` (8 external)

**Internal imports by file:**
- `input.ts`: 8 definitions (coarseBlockSize, coarseDimensions, fineBlockSize, fineDimensions, focusRing, staticDisabled, staticFocusRing, subduedFocus)
- `list.ts`: 3 definitions (densityBlockSize, focusRing, ghostHover)
- `button.ts`: 1 definition (ghostHover)
- `link.ts`: 1 definition (focusRing)
- `menu.ts`: 2 definitions (dataDisabled, subduedFocus)
- `popover.ts`: 1 definition (focusRing)
- `toast.ts`: 1 definition (focusRing)

**Completely unused:** 8 fragments
- `subtleHover`, `ghostFocusWithin` from `hover.ts`
- `hoverableOpenControlItem`, `hoverableControlItem`, `groupHoverControlItemWithTransition`, `hoverableFocusedKeyboardControls` from `hover.ts`
- `descriptionTextPrimary` from `text.ts`
