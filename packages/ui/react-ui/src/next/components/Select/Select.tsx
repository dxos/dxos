//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { createListCollection } from '@ark-ui/react/collection';
import { Portal } from '@ark-ui/react/portal';
import { Select as SelectPrimitive, useSelectContext } from '@ark-ui/react/select';
import React, { type ReactNode, type RefObject, createContext, forwardRef, useContext, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import * as Icon from '../Icon/Icon.tsx';
import { PopupScroll, popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';
import * as Separator from '../Separator/Separator.tsx';
import { useToolbarItem } from '../Toolbar/toolbar-context.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Leading icon, shown in the item and, once selected, in the trigger. */
  icon?: string;
  /** Colours the icon with a Tag hue (the current SelectField's `iconHue`). */
  iconHue?: Icon.IconHue;
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
        className={mx('dx-select', classNames)}
        ref={forwardedRef}
      >
        {children}
        <SelectPrimitive.HiddenSelect />
      </SelectPrimitive.Root>
    );
  },
);

SelectRoot.displayName = 'Select.Root';

//
// Label
//

type SelectLabelProps = ThemedClassName<SelectPrimitive.LabelProps>;

const SelectLabel = forwardRef<HTMLLabelElement, SelectLabelProps>(({ classNames, ...props }, forwardedRef) => (
  <SelectPrimitive.Label {...props} className={mx(recipes.label(), classNames)} ref={forwardedRef} />
));

SelectLabel.displayName = 'Select.Label';

//
// Trigger
//

type SelectTriggerProps = ThemedClassName<Omit<SelectPrimitive.TriggerProps, 'children'>> & {
  placeholder?: string;
  /** Options are still arriving (an async lookup): a spinner replaces the caret and the trigger is `aria-busy`. */
  loading?: boolean;
  /**
   * By default the trigger stretches across its cell. `fixed` sizes it to the widest option's icon and label (or the
   * placeholder, if wider), so choosing a different option never changes its width: the labels are laid out, hidden,
   * in the value's cell, which CSS sizes without measuring.
   */
  fixed?: boolean;
};

/** Shows the chosen option (its icon when exactly one is chosen; `multiple` lists the labels) and a caret. */
const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ classNames, placeholder, loading, fixed, ...props }, forwardedRef) => {
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
        data-fixed={fixed || undefined}
        className={mx(recipes.selectTrigger(), classNames)}
        ref={forwardedRef}
      >
        {selected?.icon && <Icon.Icon icon={selected.icon} hue={selected.iconHue} />}
        <SelectPrimitive.ValueText placeholder={placeholder} />
        {fixed && (
          <span aria-hidden data-scope='select' data-part='value-sizer' className={recipes.selectValueSizer()}>
            {placeholder && <span>{placeholder}</span>}
            {collection.items.map((item) => (
              <span key={item.value}>
                {item.icon && <Icon.Icon icon={item.icon} />}
                {item.label}
              </span>
            ))}
          </span>
        )}
        <SelectPrimitive.Indicator>
          {loading ? (
            <Icon.Icon icon='ph--spinner-gap--regular' spin />
          ) : (
            <Icon.Icon icon='ph--caret-up-down--regular' />
          )}
        </SelectPrimitive.Indicator>
      </SelectPrimitive.Trigger>
    );
  },
);

SelectTrigger.displayName = 'Select.Trigger';

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
    // With nothing to choose (a trigger still loading its options) the popup would open as an empty frame.
    if (select.collection.items.length === 0) {
      return null;
    }

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

SelectContent.displayName = 'Select.Content';

//
// Item
//

// The option an Item renders, so its parts default to the option's icon and label.
const ItemContext = createContext<SelectOption | undefined>(undefined);

const useItem = (part: string) => {
  const item = useContext(ItemContext);
  if (!item) {
    throw new Error(`Select.${part} must be inside Select.Item`);
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

SelectItem.displayName = 'Select.Item';

//
// ItemIcon
//

type SelectItemIconProps = Omit<Icon.IconProps, 'icon'> & {
  /** Defaults to the option's `icon`. */
  icon?: string;
};

/** The leading icon, in the option's `iconHue` unless given a `hue`. */
const SelectItemIcon = forwardRef<SVGSVGElement, SelectItemIconProps>(({ icon, hue, ...props }, forwardedRef) => {
  const item = useItem('ItemIcon');
  const glyph = icon ?? item.icon;
  return glyph ? <Icon.Icon {...props} icon={glyph} hue={hue ?? item.iconHue} ref={forwardedRef} /> : null;
});

SelectItemIcon.displayName = 'Select.ItemIcon';

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

SelectItemText.displayName = 'Select.ItemText';

//
// ItemIndicator
//

type SelectItemIndicatorProps = ThemedClassName<SelectPrimitive.ItemIndicatorProps>;

/** Shown while its item is selected: a check by default. */
const SelectItemIndicator = forwardRef<HTMLDivElement, SelectItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <SelectPrimitive.ItemIndicator {...props} className={mx(classNames)} ref={forwardedRef}>
      {children ?? <Icon.Icon icon='ph--check--regular' />}
    </SelectPrimitive.ItemIndicator>
  ),
);

SelectItemIndicator.displayName = 'Select.ItemIndicator';

//
// ItemGroup
//

type SelectItemGroupProps = ThemedClassName<SelectPrimitive.ItemGroupProps>;

/** A `group` of options, named by the `ItemGroupLabel` inside it. */
const SelectItemGroup = forwardRef<HTMLDivElement, SelectItemGroupProps>(({ classNames, ...props }, forwardedRef) => (
  <SelectPrimitive.ItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
));

SelectItemGroup.displayName = 'Select.ItemGroup';

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

SelectItemGroupLabel.displayName = 'Select.ItemGroupLabel';

//
// Separator
//

type SelectSeparatorProps = Omit<Separator.SeparatorProps, 'orientation' | 'decorative'>;

/** A decorative rule between options: a listbox admits only options and groups, so it takes no separator role. */
const SelectSeparator = composable<HTMLDivElement, SelectSeparatorProps>((props, forwardedRef) => (
  <Separator.Separator {...props} decorative ref={forwardedRef} />
));

SelectSeparator.displayName = 'Select.Separator';
export type {
  SelectContentProps as ContentProps,
  SelectItemGroupLabelProps as ItemGroupLabelProps,
  SelectItemGroupProps as ItemGroupProps,
  SelectItemIconProps as ItemIconProps,
  SelectItemIndicatorProps as ItemIndicatorProps,
  SelectItemProps as ItemProps,
  SelectItemTextProps as ItemTextProps,
  SelectLabelProps as LabelProps,
  SelectPositioning as Positioning,
  SelectRootProps as RootProps,
  SelectSeparatorProps as SeparatorProps,
  SelectTriggerProps as TriggerProps,
};

export {
  SelectContent as Content,
  SelectItem as Item,
  SelectItemGroup as ItemGroup,
  SelectItemGroupLabel as ItemGroupLabel,
  SelectItemIcon as ItemIcon,
  SelectItemIndicator as ItemIndicator,
  SelectItemText as ItemText,
  SelectLabel as Label,
  SelectRoot as Root,
  SelectSeparator as Separator,
  SelectTrigger as Trigger,
};
export type { SelectOption as Option };
