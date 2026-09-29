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

import { Next } from '@dxos/react-ui/next';

type NextRootProps = ComponentPropsWithoutRef<typeof Next.Listbox.Root>;
type NextItemProps = ComponentPropsWithoutRef<typeof Next.Listbox.Item>;

// Lets an Item be addressed by `id`, as the current Listbox's are, while Ark needs the option object.
const OptionsContext = createContext<ReadonlyMap<string, Next.ListboxOption>>(new Map());

//
// Root
//

type ListboxRootProps = Omit<NextRootProps, 'selectionMode' | 'value' | 'defaultValue' | 'onValueChange'> & {
  /**
   * Selected option id (controlled). Supplying any of `value`/`defaultValue`/`onValueChange` makes the list a
   * single-selection `listbox`; omitting all three renders a plain `list`.
   */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Clicking the selected row clears the selection; makes the list deselectable. */
  onDeselect?: () => void;
};

/**
 * Next.Listbox with the current Listbox's selection model: selection is opt-in and single, keyed by option `value`
 * (the current API's item `id`). Keyboard navigation, typeahead and `aria-selected` are zag's.
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

/** A Next.Listbox row addressed by id: optional icon, label over description, trailing actions or indicator. */
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
 * Selectable or plain list on Next parts. `Content` is itself the scrolling viewport (a thin ScrollArea), so there is no
 * separate `Viewport`; `ItemContent` is folded into Item's `icon`, `description` and `trailing`. Annotated so the
 * declaration names Next's parts through `Next` rather than react-ui's internal modules.
 */
export const Listbox: {
  Root: typeof ListboxRoot;
  Label: typeof Next.Listbox.Label;
  Content: typeof Next.Listbox.Content;
  Item: typeof ListboxItem;
  Indicator: typeof Next.Listbox.ItemIndicator;
} = {
  Root: ListboxRoot,
  Label: Next.Listbox.Label,
  Content: Next.Listbox.Content,
  Item: ListboxItem,
  Indicator: Next.Listbox.ItemIndicator,
};

export type { ListboxItemProps, ListboxRootProps };
