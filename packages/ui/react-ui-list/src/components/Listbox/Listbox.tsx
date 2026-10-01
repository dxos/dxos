//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  createContext,
  forwardRef,
  useContext,
  useMemo,
} from 'react';

import { Next } from '@dxos/react-ui';

type NextRootProps = ComponentPropsWithoutRef<typeof Next.Listbox.Root>;
type NextItemProps = ComponentPropsWithoutRef<typeof Next.Listbox.Item>;

// Lets an Item be addressed by `id`, as the current Listbox's are, while Ark needs the option object.
const OptionsContext = createContext<ReadonlyMap<string, Next.ListboxOption>>(new Map());

//
// Root
//

type ListboxRootProps = Omit<NextRootProps, 'selectionMode' | 'value' | 'defaultValue' | 'onValueChange'> & {
  /**
   * Selected option id (controlled). Supplying any of `value`/`defaultValue`/`onValueChange` makes the list
   * single-selection; omitting all three selects nothing (`selectionMode='none'`), keeping zag's navigation. Multiple
   * selection, or a `useListSelection`-shaped value, goes through `listboxSelection` on `Next.Listbox.Root`.
   */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Clicking the selected row clears the selection; makes the list deselectable. */
  onDeselect?: () => void;
};

/**
 * Next.Listbox with the current Listbox's selection model: selection is opt-in and single, keyed by option `value`
 * (the current API's item `id`). Ark owns the selection state; keyboard navigation, typeahead and `aria-selected` are
 * zag's.
 */
const ListboxRoot: ForwardRefExoticComponent<ListboxRootProps & RefAttributes<HTMLDivElement>> = forwardRef<
  HTMLDivElement,
  ListboxRootProps
>(({ items, value, defaultValue, onValueChange, onDeselect, children, ...props }, forwardedRef) => {
  const selectable = value !== undefined || defaultValue !== undefined || onValueChange !== undefined;
  const options = useMemo(() => new Map(items.map((item) => [item.value, item])), [items]);
  return (
    <OptionsContext.Provider value={options}>
      <Next.Listbox.Root
        {...props}
        items={items}
        selectionMode={selectable ? 'single' : 'none'}
        value={value === undefined ? undefined : [value]}
        defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
        deselectable={onDeselect !== undefined}
        onValueChange={(next) => {
          const [selected] = next;
          if (selected === undefined) {
            onDeselect?.();
          } else {
            onValueChange?.(selected);
          }
        }}
        ref={forwardedRef}
      >
        {children}
      </Next.Listbox.Root>
    </OptionsContext.Provider>
  );
});

ListboxRoot.displayName = 'Listbox.Root';

//
// Item
//

type ListboxItemProps = Omit<NextItemProps, 'item'> & {
  /** The option's `value`; the option itself comes from Root's `items`. */
  id: string;
};

/** A Next.Listbox row addressed by id: the option's default row, or the parts given as children. */
const ListboxItem: ForwardRefExoticComponent<ListboxItemProps & RefAttributes<HTMLDivElement>> = forwardRef<
  HTMLDivElement,
  ListboxItemProps
>(({ id, ...props }, forwardedRef) => {
  const options = useContext(OptionsContext);
  const item = options.get(id);
  if (!item) {
    return null;
  }
  return <Next.Listbox.Item {...props} item={item} ref={forwardedRef} />;
});

ListboxItem.displayName = 'Listbox.Item';

/**
 * Selectable or plain list on Next parts, with Next.Listbox's part names. `Content` is itself the scrolling viewport (a
 * thin ScrollArea; `scroll={false}` inside a host that scrolls, such as a ScrollArea composed in `Panel.Body`), so
 * there is no separate `Viewport`; the current `ItemContent` becomes a row composed from `ItemIcon`, `ItemText`,
 * `ItemDescription` and trailing controls. Annotated so the declaration names Next's parts through `Next` rather than
 * react-ui's modules.
 */
export const Listbox: {
  Root: typeof ListboxRoot;
  Label: typeof Next.Listbox.Label;
  Content: typeof Next.Listbox.Content;
  Empty: typeof Next.Listbox.Empty;
  Item: typeof ListboxItem;
  ItemIcon: typeof Next.Listbox.ItemIcon;
  ItemText: typeof Next.Listbox.ItemText;
  ItemDescription: typeof Next.Listbox.ItemDescription;
  ItemIndicator: typeof Next.Listbox.ItemIndicator;
  ItemGroup: typeof Next.Listbox.ItemGroup;
  ItemGroupLabel: typeof Next.Listbox.ItemGroupLabel;
} = {
  Root: ListboxRoot,
  Label: Next.Listbox.Label,
  Content: Next.Listbox.Content,
  Empty: Next.Listbox.Empty,
  Item: ListboxItem,
  ItemIcon: Next.Listbox.ItemIcon,
  ItemText: Next.Listbox.ItemText,
  ItemDescription: Next.Listbox.ItemDescription,
  ItemIndicator: Next.Listbox.ItemIndicator,
  ItemGroup: Next.Listbox.ItemGroup,
  ItemGroupLabel: Next.Listbox.ItemGroupLabel,
};

export type { ListboxItemProps, ListboxRootProps };
