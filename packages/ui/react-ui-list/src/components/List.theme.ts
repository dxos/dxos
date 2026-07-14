//
// Copyright 2026 DXOS.org
//

import { tv } from '@dxos/ui-theme';

/**
 * Tailwind-variants theme for all react-ui-list components.
 * Consumers call `listTheme.styles()` to get the slot functions.
 * Each slot function accepts an optional `{ class: ... }` override for per-instance merging.
 *
 * Structural pattern shared across list components:
 * - viewport: ScrollArea wrapper (`dx-container`)
 * - content:  flex-col item container
 * - item:     base row (interactive affordances come from dx-hover / dx-selected / dx-current)
 */
const listStyles = tv({
  slots: {
    //
    // Accordion
    //
    accordionItem: 'overflow-hidden',
    // Row trigger: spans the full width and pins the trailing caret to the inline-end edge.
    accordionTrigger: 'group flex items-start justify-between gap-2 p-2 dx-focus-ring-inset w-full text-start',
    // Leading / trailing icon wrappers: fixed height so they sit on the centerline of the first
    // content line even when the header spans multiple lines.
    accordionTriggerIcon: 'flex items-center h-6 shrink-0',
    accordionTriggerContent: 'min-w-0 flex-1',
    // Slide animations are driven by Radix Accordion's data-state attribute.
    accordionBody: 'overflow-hidden data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down',
    accordionBodyContent: 'p-2',

    //
    // Listbox
    //
    listboxViewport: 'dx-container',
    listboxContent: 'flex flex-col',
    // `dx-selected` pairs with `aria-selected="true"` set per-option (see
    // `ui-theme/src/css/components/state.md`). `outline-none` removes the native focus
    // ring; Tabster / `dx-focus-ring` handles keyboard focus at the container level.
    listboxItem: 'flex items-center dx-hover dx-selected px-3 py-2 cursor-pointer outline-none',
    listboxItemLabel: 'grow truncate',

    //
    // OrderedList
    //
    orderedListViewport: 'dx-container',
    orderedListContent: 'flex flex-col',
    // `dx-current` enables `aria-current` row styling (not listbox/option semantics).
    orderedListItem: 'relative dx-current',
    // Bordered column wrapping title + detail panel in the master-detail layout.
    orderedListDetailColumn: 'flex flex-col ring-1 ring-subdued-separator rounded-sm overflow-hidden',
    // `min-h` matches the shared rail-item track so handles, title, and caret share a baseline.
    orderedListDetailTitleRow: 'flex items-center min-h-[var(--dx-rail-item)]',
    orderedListDetailPanel: 'px-2 pb-2',
    orderedListTitle: 'flex grow items-center truncate cursor-pointer',

    //
    // Picker
    //
    // `px-[var(--gutter,…)]` aligns padding with sibling `Column.Center` content, falling back to
    // 0.75rem when not nested under `Column.Root`.
    pickerItem: 'dx-hover dx-selected px-[var(--gutter,0.75rem)] py-1 cursor-pointer select-none',

    //
    // Combobox
    //
    // `m-form-chrome mb-0` mirrors the rest of the form-chrome padding convention.
    comboboxInput: 'm-form-chrome mb-0 w-[calc(100%-2*var(--spacing-form-chrome))]',
    comboboxList: 'py-form-chrome',
    // Trigger value / placeholder text — grows and truncates; subdued when placeholder.
    comboboxTriggerText: 'font-normal text-start flex-1 min-w-0 truncate me-2',
    // Item row adds flex layout; `dx-hover`/`dx-selected` and padding come from `Picker.Item`.
    comboboxItem: 'flex w-full gap-2 items-center',
    comboboxItemDescription: 'text-sm text-description truncate',

    //
    // ItemContent
    //
    // Grid whose columns/placement come from the `hasIcon` variant: a leading rail-item icon track
    // only when an icon is present, so an icon-less row doesn't reserve (and indent past) empty space.
    itemContentRoot: 'grid items-center gap-x-2 is-full min-is-0',
    itemContentIcon: 'col-start-1 row-start-1 place-self-center',
    itemContentTitle: 'row-start-1 min-is-0 truncate',
    itemContentDescription: 'row-start-2 min-is-0 truncate text-sm text-description',

    //
    // Empty
    //
    empty: 'flex flex-col items-center justify-center gap-2 p-4 text-sm text-center text-description',
  },
  variants: {
    // Reserve the leading icon track only when an icon is rendered; otherwise the content occupies a
    // single full-width column instead of being indented past an empty icon slot.
    hasIcon: {
      true: {
        itemContentRoot: 'w-full grid-cols-[var(--dx-rail-item)_minmax(0,1fr)]',
        itemContentTitle: 'col-start-2',
        itemContentDescription: 'col-start-2',
      },
      false: {
        itemContentRoot: 'w-full grid-cols-[minmax(0,1fr)]',
        itemContentTitle: 'col-start-1',
        itemContentDescription: 'col-start-1',
      },
    },
  },
  defaultVariants: {
    hasIcon: true,
  },
});

/** react-ui-list theme: call `.styles()` to get per-slot class functions. */
export const listTheme = {
  styles: listStyles,
};

/** Slot names of {@link listTheme.styles}, for `bridgeTv` registration. */
export const listSlots = Object.keys(listTheme.styles()) as Array<keyof ReturnType<typeof listTheme.styles>>;
