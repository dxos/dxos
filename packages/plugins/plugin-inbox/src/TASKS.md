# Refactor

We have a complex refactor of `react-ui-mosaic` and `plugin-inbox`.
Think deeply about the problem and ask clarifying questions.
Use this document to plan and track the refactor.

## Phase 1

MessageStack tracks the current (aria-current) focused item via MessageStackContextValue.
It contains some complex logic to detect and track the current focus and restore it when the virtual stack scrolls the item back into view.

- [x] Remove `MessageStackContextValue` and instead track the `currentItem` in `Mosaic.Container`'s context.
- [x] Remove the custom focus management, `useLayoutEffect`, and `onChange` callback in `MessageStack`.
- [x] `useMosaicContainerContext` should expose `setCurrent` to allow Tiles to set the current item (e.g., if clicked).
- [x] `Mosaic.Tile` should be passed a boolean, `current` if it is the current item.
- [x] `MessageTile` should use `setCurrent` to set the current item when clicked (via `Focus.Item`'s callback).

## Phase 2

In `plugin-inbox` `MessageStack` uses `Mosaic.VirtualStack`;

- [ ] `EventStack` should follow the same structure and `EventComponent` should become `EventTile` simlilar to `MessageTile`
- [ ] `EventArticle` should similarly track the currentItem via `useSelected`.

## Phase n

- [ ] Review `useSelected` and `AttentionOperation.Select` (currently conflates active and selected).
