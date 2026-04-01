# Refactor

We have a complex refactor of `react-ui-mosaic` and `plugin-inbox`.
Think deeply about the problem and ask clarifying questions.
Use this document to plan and track the refactor.

## Phase 1 (Stack)

MessageStack tracks the current (aria-current) focused item via MessageStackContextValue.
It contains some complex logic to detect and track the current focus and restore it when the virtual stack scrolls the item back into view.

- [x] Remove `MessageStackContextValue` and instead track the `currentItem` in `Mosaic.Container`'s context.
- [x] Remove the custom focus management, `useLayoutEffect`, and `onChange` callback in `MessageStack`.
- [x] `useMosaicContainerContext` should expose `setCurrent` to allow Tiles to set the current item (e.g., if clicked).
- [x] `Mosaic.Tile` should be passed a boolean, `current` if it is the current item.
- [x] `MessageTile` should use `setCurrent` to set the current item when clicked (via `Focus.Item`'s callback).

## Phase 2 (Calendar)

In `plugin-inbox` `MessageStack` uses `Mosaic.VirtualStack`;

- [x] `EventStack` should follow the same structure and `EventComponent` should become `EventTile` simlilar to `MessageTile`
- [x] `EventArticle` should similarly track the currentItem via `useSelected`.

## Phase 3 (Focus)

We have multiple ways to visually represent focused/current/selected items, including:

1. Specific focus styles: `focusRingStyles` in `Focus.tsx` (react-ui)
2. Custom fragments: `fragments/focus.ts` (ui-theme)
3. Tailwind component classes: `selected.css` (ui-theme)
4. Tailwind classes in `focus-ring.css` (ui-theme)

### 3a. Create `ui-theme/src/theme/components/focus.ts`

Move `focusRingStyles` from `Focus.tsx` into a theme component, following the same pattern as `card.ts`, `list.ts`, etc.

`Focus.tsx` currently defines styles inline via `mx()`:

```typescript
const focusRingStyles = (border: boolean) =>
  mx(
    'relative outline-hidden',
    border && 'border border-separator',
    'after:content-[""] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:ring after:ring-inset after:ring-transparent',
    'focus:after:ring-neutral-focus-indicator',
    'data-[focus-state=active]:after:ring-neutral-focus-indicator',
    'data-[focus-state=error]:after:ring-rose-500',
  );
```

This should become a `focusTheme` in `ui-theme/src/theme/components/focus.ts` with:

- `focus.group` — styles for `Focus.Group`.
- `focus.item` — styles for `Focus.Item`.

Both currently use the same `focusRingStyles(border)` call, so initially they can share.

`Focus.tsx` would then import `focusTheme` and use `tx('focus.group', { border }, className)` / `tx('focus.item', { border }, className)` like other themed components.

- [x] Create `ui-theme/src/theme/components/focus.ts` with `FocusStyleProps` and `focusTheme`.
- [x] Export from `ui-theme/src/theme/components/index.ts`.
- [x] Register in the theme (`ui-theme/src/theme/theme.ts`).
- [x] Update `Focus.tsx` to use `tx('focus.group', ...)` and `tx('focus.item', ...)` instead of `focusRingStyles`.
- [x] Remove `focusRingStyles` from `Focus.tsx`.

### 3b. Delete `fragments/focus.ts`

`fragments/focus.ts` exports three string constants:

- `focusRing = 'dx-focus-ring'` — used in 5 internal theme components + 2 external files.
- `subduedFocus` — used in 2 internal theme components (`input.ts`, `menu.ts`).
- `staticFocusRing` — used only in `input.ts`.

Replace all usages with CSS class references.

- [x] Replace `focusRing` usages with `'dx-focus-ring'` in: `link.ts`, `list.ts`, `popover.ts`, `toast.ts`, `react-ui-thread/Message.tsx`, `shell/InvitationListItem.tsx`.
- [x] Create `.dx-focus-subdued` class in `focus.css` equivalent to `subduedFocus` value; use in `input.ts` and `menu.ts`.
- [x] Create `.dx-focus-static` class in `focus.css` equivalent to `staticFocusRing` value; use in `input.ts`.
- [x] Delete `fragments/focus.ts`.
- [x] Remove `focus` re-export from `fragments/index.ts`.
- [x] Rename `focus-ring.css` to `focus.css`.

### 3c. Use-case taxonomy (recommendations)

Four distinct visual states, each with a clear mechanism:

| State              | Attribute/Mechanism    | CSS Class                        | When                                                            |
| ------------------ | ---------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Keyboard focus** | `:focus-visible`       | `dx-focus-ring` (focus-ring.css) | Element receives keyboard focus.                                |
| **Current/active** | `aria-current="true"`  | `dx-current` (selected.css)      | Item is the active item in a navigable list (e.g., arrow keys). |
| **Selected**       | `aria-selected="true"` | `dx-selected` (selected.css)     | Item is part of a multi-selection.                              |
| **Hover**          | `:hover`               | `dx-hover` (selected.css)        | Mouse hover.                                                    |

Recommendations:

- These four states are orthogonal and should remain separate CSS classes.
- `dx-focus-ring` handles keyboard focus via `:focus-visible` — well-established, 106 usages, no change needed.
- `dx-current` handles current/active via `aria-current` — set by `Focus.Item`, styled in `selected.css`.
- `dx-selected` handles multi-selection via `aria-selected` — styled in `selected.css`.
- `dx-hover` handles mouse hover — styled in `selected.css`.
- The `::after` pseudo-element ring in `Focus.Group`/`Focus.Item` (from `focusRingStyles`) is a **separate concern** from `dx-focus-ring`. It provides a container-level focus indicator for grouped navigation. After Phase 3a, this will live in `focus.ts` theme component.
- `focus-ring.css` should remain the single source for element-level keyboard focus rings.
- `selected.css` should remain the single source for state-driven visual feedback (current, selected, hover).

## Phase 4 (Selection)

- [ ] Review `useSelected` and `AttentionOperation.Select` (currently conflates active and selected).
