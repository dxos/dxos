//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Portal } from '@ark-ui/react/portal';
import { Select as SelectPrimitive, useSelectContext } from '@ark-ui/react/select';
import React, { type ReactNode, type RefObject, createContext, forwardRef, useContext, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon, type IconHue, type IconProps } from '../Icon/index.ts';
import { PopupScroll, popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';
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

/** Ark's positioning less `sameWidth`; an interface, so declarations name it rather than expanding floating-ui's types. */
interface SelectPositioning extends Omit<
  NonNullable<SelectPrimitive.RootProps<SelectOption>['positioning']>,
  'sameWidth'
> {}

type SelectRootProps = ThemedClassName<Omit<SelectPrimitive.RootProps<SelectOption>, 'collection' | 'positioning'>> & {
  items: SelectOption[];
  /** Ark's positioning, less `sameWidth`: the popup is always at least the trigger's width and grows to its options. */
  positioning?: SelectPositioning;
};

/**
 * Ark select over a flat option list (grouped in the popup with `ItemGroup`); the root takes no box so its trigger is
 * laid out as the parent's child. `multiple` keeps the popup open while choosing. The popup is at least as wide as
 * the trigger and grows to fit its widest option, up to the viewport's width.
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
        positioning={popupPositioning(POPUP_GUTTER, positioning)}
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

/** How wide the trigger is: `fill` takes its cell's width; `options` fits the widest option (or the placeholder). */
type SelectTriggerFit = 'fill' | 'options';

type SelectTriggerProps = ThemedClassName<Omit<SelectPrimitive.TriggerProps, 'children'>> & {
  placeholder?: string;
  /** Options are still arriving (an async lookup): a spinner replaces the caret and the trigger is `aria-busy`. */
  loading?: boolean;
  /**
   * `fill` (default) stretches the trigger across its cell. `options` sizes it to the widest option's icon and label
   * (or the placeholder, if wider), so choosing a different option never changes its width: the labels are laid out,
   * hidden, in the value's cell, which CSS sizes without measuring.
   */
  fit?: SelectTriggerFit;
};

/** Shows the chosen option (its icon when exactly one is chosen; `multiple` lists the labels) and a caret. */
const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ classNames, placeholder, loading, fit = 'fill', ...props }, forwardedRef) => {
    const toolbarItem = useToolbarItem(props.disabled);
    const { selectedItems, collection } = useSelectContext();
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
        data-fit={fit === 'fill' ? undefined : fit}
        className={mx(recipes.selectTrigger(), classNames)}
        ref={forwardedRef}
      >
        {selected?.icon && <Icon icon={selected.icon} hue={selected.iconHue} />}
        <SelectPrimitive.ValueText placeholder={placeholder} />
        {fit === 'options' && (
          <span aria-hidden data-scope='select' data-part='value-sizer' className={recipes.selectValueSizer()}>
            {placeholder && <span>{placeholder}</span>}
            {collection.items.map((item) => (
              <span key={item.value}>
                {item.icon && <Icon icon={item.icon} />}
                {item.label}
              </span>
            ))}
          </span>
        )}
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
  /** Overrides the size inherited from the trigger's nearest sized ancestor (Phase 4 decision 2). */
  size?: Size;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
};

/**
 * Ark's content as a composable part, so the ScrollArea viewport slot merges onto it (a plain Ark part gets the dev
 * warning wrapper, which breaks the frame's child rules); it restates Ark's scope and part, which the slot's replace.
 */
const SelectViewport = composable<HTMLDivElement, SelectPrimitive.ContentProps>((props, forwardedRef) => (
  <SelectPrimitive.Content {...composableProps(props)} data-scope='select' data-part='content' ref={forwardedRef} />
));

/** Portalled listbox at `level='popup'`, scrolling in a thin ScrollArea whose viewport is the listbox itself. */
const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ classNames, size, container, children, ...props }, forwardedRef) => {
    const select = useSelectContext();
    const popupSize = usePopupSize(size, select.open, [select.getTriggerProps().id]);
    return (
      <Portal container={container}>
        <SelectPrimitive.Positioner>
          <PopupScroll size={popupSize} classNames={mx(classNames)}>
            <SelectViewport {...props} ref={forwardedRef}>
              {children}
            </SelectViewport>
          </PopupScroll>
        </SelectPrimitive.Positioner>
      </Portal>
    );
  },
);

SelectContent.displayName = 'Next.Select.Content';

//
// Item
//

// The option an Item renders, so its parts default to the option's icon and label.
const ItemContext = createContext<SelectOption | undefined>(undefined);

const useItem = (part: string) => {
  const item = useContext(ItemContext);
  if (!item) {
    throw new Error(`Next.Select.${part} must be inside Next.Select.Item`);
  }
  return item;
};

type SelectItemProps = ThemedClassName<Omit<SelectPrimitive.ItemProps, 'item' | 'children'>> & {
  item: SelectOption;
  /** Replaces the whole row, composed from `ItemIcon`, `ItemText` and `ItemIndicator`; the trigger still shows the label. */
  children?: ReactNode;
};

/** A block-tall row: without children, the option's icon, its label and the check shown while it is selected. */
const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ classNames, item, children, ...props }, forwardedRef) => (
    <ItemContext.Provider value={item}>
      <SelectPrimitive.Item {...props} item={item} className={mx(recipes.selectItem(), classNames)} ref={forwardedRef}>
        {children ?? (
          <>
            {item.icon && <SelectItemIcon />}
            <SelectItemText />
            <SelectItemIndicator />
          </>
        )}
      </SelectPrimitive.Item>
    </ItemContext.Provider>
  ),
);

SelectItem.displayName = 'Next.Select.Item';

//
// ItemIcon
//

type SelectItemIconProps = Omit<IconProps, 'icon'> & {
  /** Defaults to the option's `icon`. */
  icon?: string;
};

/** The leading icon, in the option's `iconHue` unless given a `hue`. */
const SelectItemIcon = forwardRef<SVGSVGElement, SelectItemIconProps>(({ icon, hue, ...props }, forwardedRef) => {
  const item = useItem('ItemIcon');
  const glyph = icon ?? item.icon;
  return glyph ? <Icon {...props} icon={glyph} hue={hue ?? item.iconHue} ref={forwardedRef} /> : null;
});

SelectItemIcon.displayName = 'Next.Select.ItemIcon';

//
// ItemText
//

type SelectItemTextProps = ThemedClassName<SelectPrimitive.ItemTextProps>;

/** The row's label, taking the free space; the option's `label` by default. */
const SelectItemText = forwardRef<HTMLDivElement, SelectItemTextProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const item = useItem('ItemText');
    return (
      <SelectPrimitive.ItemText {...props} className={mx(classNames)} ref={forwardedRef}>
        {children ?? item.label}
      </SelectPrimitive.ItemText>
    );
  },
);

SelectItemText.displayName = 'Next.Select.ItemText';

//
// ItemIndicator
//

type SelectItemIndicatorProps = ThemedClassName<SelectPrimitive.ItemIndicatorProps>;

/** Shown while its item is selected: a check by default. */
const SelectItemIndicator = forwardRef<HTMLDivElement, SelectItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <SelectPrimitive.ItemIndicator {...props} className={mx(classNames)} ref={forwardedRef}>
      {children ?? <Icon icon='ph--check--regular' />}
    </SelectPrimitive.ItemIndicator>
  ),
);

SelectItemIndicator.displayName = 'Next.Select.ItemIndicator';

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
  ItemIcon: SelectItemIcon,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
  ItemGroup: SelectItemGroup,
  ItemGroupLabel: SelectItemGroupLabel,
  Separator: SelectSeparator,
};

export type {
  SelectContentProps,
  SelectItemGroupLabelProps,
  SelectItemGroupProps,
  SelectItemIconProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectLabelProps,
  SelectPositioning,
  SelectRootProps,
  SelectSeparatorProps,
  SelectTriggerFit,
  SelectTriggerProps,
};
