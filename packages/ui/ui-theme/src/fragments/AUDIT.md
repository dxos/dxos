# Fragment Definitions Audit

External packages importing fragment definitions from `ui-theme/src/fragments`.

## Current Fragment Exports

| File          | Definition                            | External | Internal |
| ------------- | ------------------------------------- | -------- | -------- |
| `density.ts`  | `densityBlockSize`                    | 0        | 1        |
| `density.ts`  | `coarseBlockSize`                     | 0        | 0        |
| `density.ts`  | `coarseDimensions`                    | 0        | 0        |
| `density.ts`  | `fineBlockSize`                       | 0        | 0        |
| `density.ts`  | `fineDimensions`                      | 0        | 0        |
| `disabled.ts` | `staticDisabled`                      | 0        | 0        |
| `disabled.ts` | `dataDisabled`                        | 0        | 1        |
| `focus.ts`    | `focusRing`                           | 2        | 4        |
| `focus.ts`    | `subduedFocus`                        | 0        | 1        |
| `focus.ts`    | `staticFocusRing`                     | 0        | 0        |
| `hover.ts`    | `subtleHover`                         | 4        | 0        |
| `hover.ts`    | `ghostHover`                          | 7        | 2        |
| `hover.ts`    | `ghostFocusWithin`                    | 0        | 0        |
| `hover.ts`    | `hoverableControls`                   | 8        | 0        |
| `hover.ts`    | `groupHoverControlItemWithTransition` | 2        | 0        |
| `hover.ts`    | `hoverableFocusedKeyboardControls`    | 0        | 0        |
| `hover.ts`    | `hoverableFocusedWithinControls`      | 8        | 0        |
| `hover.ts`    | `hoverableOpenControlItem`            | 3        | 0        |
| `hover.ts`    | `hoverableControlItem`                | 7        | 0        |
| `text.ts`     | `descriptionTextPrimary`              | 1        | 0        |
| `text.ts`     | `descriptionMessage`                  | 5        | 0        |

## Summary

**Total fragments:** 21
**Total imports (external + internal):** 99
- **External:** 81
- **Internal:** 18

**Most imported (external):**
- `hoverableControls` (8)
- `hoverableFocusedWithinControls` (8)
- `ghostHover` (7)
- `hoverableControlItem` (7)

**Most imported overall:**
- `focusRing` (2 external + 4 internal = 6 total)
- `ghostHover` (7 external + 2 internal = 9 total)

**Completely unused:** 11 fragments
- All from `density.ts` except `densityBlockSize`
- All from `disabled.ts` except `dataDisabled`
- `staticFocusRing`, `subduedFocus` from `focus.ts` (but `subduedFocus` has 1 internal use)
- `ghostFocusWithin`, `hoverableFocusedKeyboardControls` from `hover.ts`
- `descriptionTextPrimary` from `text.ts`
