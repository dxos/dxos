//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Portal } from '@ark-ui/react/portal';
import { Select as SelectPrimitive, useSelectContext } from '@ark-ui/react/select';
import React, { type ReactNode, forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon, type IconHue } from '../Icon/index.ts';
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
  /** Colours the icon with a Tag hue (the current SelectField's `iconHue`). */
  iconHue?: IconHue;
};

//
// Root
//

type SelectRootProps = ThemedClassName<Omit<SelectPrimitive.RootProps<SelectOption>, 'collection'>> & {
  items: SelectOption[];
};

/**
 * Ark select over a flat option list (grouped in the popup with `ItemGroup`); the root takes no box so its trigger is
 * laid out as the parent's child. `multiple` keeps the popup open while choosing.
 */
const SelectRoot = forwardRef<HTMLDivElement, SelectRootProps>(
  (
    {
      classNames,
      items,
      positioning,
      lazyMount = true,
      unmountOnExit = true,
      multiple,
      closeOnSelect = !multiple,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const collection = useMemo(() => createListCollection<SelectOption>({ items }), [items]);
    return (
      <SelectPrimitive.Root
        {...props}
        multiple={multiple}
        closeOnSelect={closeOnSelect}
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
  /** Options are still arriving (an async lookup): a spinner replaces the caret and the trigger is `aria-busy`. */
  loading?: boolean;
};

/** Shows the chosen option (its icon when exactly one is chosen; `multiple` lists the labels) and a caret. */
const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ classNames, placeholder, loading, ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { selectedItems } = useSelectContext();
    const selected = selectedItems.length === 1 ? selectedItems[0] : undefined;
    return (
      <SelectPrimitive.Trigger
        {...props}
        {...toolbarItem}
        aria-busy={loading || undefined}
        onFocus={(event) => {
          props.onFocus?.(event);
          toolbarItem?.onFocus();
        }}
        className={mx(recipes.selectTrigger(), classNames)}
        ref={forwardedRef}
      >
        {selected?.icon && <Icon icon={selected.icon} hue={selected.iconHue} />}
        <SelectPrimitive.ValueText placeholder={placeholder} />
        <SelectPrimitive.Indicator>
          {loading ? <Icon icon='ph--spinner-gap--regular' data-spin='' /> : <Icon icon='ph--caret-up-down--regular' />}
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
  /** Replaces the icon and label (e.g. a label with a secondary line); the trigger still shows the option's label. */
  children?: ReactNode;
};

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ classNames, item, children, ...props }, forwardedRef) => (
    <SelectPrimitive.Item {...props} item={item} className={mx(recipes.selectItem(), classNames)} ref={forwardedRef}>
      {children ?? (
        <>
          {item.icon && <Icon icon={item.icon} hue={item.iconHue} />}
          <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
        </>
      )}
      <SelectPrimitive.ItemIndicator>
        <Icon icon='ph--check--regular' />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  ),
);

SelectItem.displayName = 'Next.Select.Item';

//
// ItemGroup
//

type SelectItemGroupProps = ThemedClassName<SelectPrimitive.ItemGroupProps>;

/** A `group` of options, named by the `ItemGroupLabel` inside it. */
const SelectItemGroup = forwardRef<HTMLDivElement, SelectItemGroupProps>(({ classNames, ...props }, forwardedRef) => (
  <SelectPrimitive.ItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
));

SelectItemGroup.displayName = 'Next.Select.ItemGroup';

//
// ItemGroupLabel
//

type SelectItemGroupLabelProps = ThemedClassName<SelectPrimitive.ItemGroupLabelProps>;

/** A small caption naming the group, like `Menu.ItemGroupLabel`. */
const SelectItemGroupLabel = forwardRef<HTMLDivElement, SelectItemGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <SelectPrimitive.ItemGroupLabel
      {...props}
      className={mx(recipes.popupGroupLabel(), classNames)}
      ref={forwardedRef}
    />
  ),
);

SelectItemGroupLabel.displayName = 'Next.Select.ItemGroupLabel';

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
  ItemGroup: SelectItemGroup,
  ItemGroupLabel: SelectItemGroupLabel,
  Separator: SelectSeparator,
};

export type {
  SelectContentProps,
  SelectItemGroupLabelProps,
  SelectItemGroupProps,
  SelectItemProps,
  SelectLabelProps,
  SelectRootProps,
  SelectSeparatorProps,
  SelectTriggerProps,
};
