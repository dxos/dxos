//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Portal } from '@ark-ui/react/portal';
import { Select as SelectPrimitive, useSelectContext } from '@ark-ui/react/select';
import React, { forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon } from '../Icon/index.ts';
import { Separator, type SeparatorProps } from '../Separator/index.ts';
import { useToolbarItem } from '../Toolbar/index.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Leading icon, shown in the item and, once selected, in the trigger. */
  icon?: string;
};

//
// Root
//

type SelectRootProps = ThemedClassName<Omit<SelectPrimitive.RootProps<SelectOption>, 'collection'>> & {
  items: SelectOption[];
};

/** Ark select over a flat option list; the root takes no box so its trigger is laid out as the parent's child. */
const SelectRoot = forwardRef<HTMLDivElement, SelectRootProps>(
  ({ classNames, items, positioning, lazyMount = true, unmountOnExit = true, children, ...props }, forwardedRef) => {
    const collection = useMemo(() => createListCollection<SelectOption>({ items }), [items]);
    return (
      <SelectPrimitive.Root
        {...props}
        // Mounting the popup on open keeps it out of a modal Dialog's one-time `aria-hidden` sweep of its siblings.
        lazyMount={lazyMount}
        unmountOnExit={unmountOnExit}
        // Ark's 8px default reads as detached from the trigger.
        positioning={{ gutter: POPUP_GUTTER, ...positioning }}
        collection={collection}
        className={mx('nx-select', classNames)}
        ref={forwardedRef}
      >
        {children}
        <SelectPrimitive.HiddenSelect />
      </SelectPrimitive.Root>
    );
  },
);

SelectRoot.displayName = 'Next.Select.Root';

//
// Label
//

type SelectLabelProps = ThemedClassName<SelectPrimitive.LabelProps>;

const SelectLabel = forwardRef<HTMLLabelElement, SelectLabelProps>(({ classNames, ...props }, forwardedRef) => (
  <SelectPrimitive.Label {...props} className={mx(recipes.label(), classNames)} ref={forwardedRef} />
));

SelectLabel.displayName = 'Next.Select.Label';

//
// Trigger
//

type SelectTriggerProps = ThemedClassName<Omit<SelectPrimitive.TriggerProps, 'children'>> & {
  placeholder?: string;
};

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ classNames, placeholder, ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const [selected] = useSelectContext().selectedItems;
    return (
      <SelectPrimitive.Trigger
        {...props}
        {...toolbarItem}
        onFocus={(event) => {
          props.onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        className={mx(recipes.selectTrigger(), classNames)}
        ref={forwardedRef}
      >
        {selected?.icon && <Icon icon={selected.icon} />}
        <SelectPrimitive.ValueText placeholder={placeholder} />
        <SelectPrimitive.Indicator>
          <Icon icon='ph--caret-up-down--regular' />
        </SelectPrimitive.Indicator>
      </SelectPrimitive.Trigger>
    );
  },
);

SelectTrigger.displayName = 'Next.Select.Trigger';

//
// Content
//

type SelectContentProps = ThemedClassName<SelectPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size. */
  size?: Size;
};

/** Portalled listbox at `level='popup'`. */
const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ classNames, size, children, ...props }, forwardedRef) => (
    <Portal>
      <SelectPrimitive.Positioner>
        <SelectPrimitive.Content
          {...props}
          data-surface='popup'
          data-size={size}
          className={mx(recipes.popup(), classNames)}
          ref={forwardedRef}
        >
          {children}
        </SelectPrimitive.Content>
      </SelectPrimitive.Positioner>
    </Portal>
  ),
);

SelectContent.displayName = 'Next.Select.Content';

//
// Item
//

type SelectItemProps = ThemedClassName<Omit<SelectPrimitive.ItemProps, 'item' | 'children'>> & {
  item: SelectOption;
};

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(({ classNames, item, ...props }, forwardedRef) => (
  <SelectPrimitive.Item {...props} item={item} className={mx(recipes.selectItem(), classNames)} ref={forwardedRef}>
    {item.icon && <Icon icon={item.icon} />}
    <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator>
      <Icon icon='ph--check--regular' />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));

SelectItem.displayName = 'Next.Select.Item';

//
// Separator
//

type SelectSeparatorProps = Omit<SeparatorProps, 'orientation' | 'decorative'>;

/** A decorative rule between options: a listbox admits only options and groups, so it takes no separator role. */
const SelectSeparator = composable<HTMLDivElement, SelectSeparatorProps>((props, forwardedRef) => (
  <Separator {...props} decorative ref={forwardedRef} />
));

SelectSeparator.displayName = 'Next.Select.Separator';

export const Select = {
  Root: SelectRoot,
  Label: SelectLabel,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
  Separator: SelectSeparator,
};

export type {
  SelectContentProps,
  SelectItemProps,
  SelectLabelProps,
  SelectRootProps,
  SelectSeparatorProps,
  SelectTriggerProps,
};
