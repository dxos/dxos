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

We have multiple ways to visually represet focused/current/selected items, including:

1. Specific focus styles: `focusRingStyles` in `Focus.tsx` (ui-theme)
2. Custom fragments: `fragments/focus.ts` (react-ui)
3. Tailwind component classes: `selected.css` (ui-theme)
4. Tailwind classes in `focus-ring.css` (ui-theme)

- [ ] Consider moving the definitions in `fragments/focus.ts` to equivalent classes in `focus-ring.css`; update all usages.
- [ ] Similar to other `react-ui` components, move the current focus styles from `Focus.tsx` into `ui-theme/src/theme/components/focus.ts`.
- [ ] Consider the different use cases (below) covered by the cases above; make recommendations for further simplification/unification.
  - Keyboard focus
  - Current/active item (for navigation)
  - Selected (e.g., could be multi-selected)
  - Hover

## Phase 4 (Selection)

- [ ] Review `useSelected` and `AttentionOperation.Select` (currently conflates active and selected).
