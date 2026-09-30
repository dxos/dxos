//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Listbox as ListboxPrimitive } from '@ark-ui/react/listbox';
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
} from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type ContainerProps, containerAttributes } from '../Container/index.ts';
import { Icon } from '../Icon/index.ts';
import { ScrollArea, type ScrollAreaRootProps } from '../ScrollArea/index.ts';

export type ListboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Leading icon of the default row. */
  icon?: string;
  /** Second line of the default row. */
  description?: string;
};

/** `none` is a plain `role=list` with no selection, focus or keyboard contract (decision 9). */
export type ListboxSelectionMode = 'single' | 'multiple' | 'none';

// Behaviour, not size or level (decision 3): whether the parts render Ark's listbox or a plain list.
const SelectableContext = createContext(true);

//
// Root
//

type ListboxRootProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onSelect'>> & {
  items: ListboxOption[];
  /** `single` by default; `multiple` toggles each item; `none` renders a plain list. */
  selectionMode?: ListboxSelectionMode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Clicking the selected item of a single-selection list clears it. */
  deselectable?: boolean;
  disabled?: boolean;
  /** Arrow keys wrap from the last item to the first and back. */
  loopFocus?: boolean;
  size?: Size;
};

/**
 * Ark listbox (single or multiple selection; keyboard navigation, typeahead and `aria-selected` from zag) or, with
 * `selectionMode='none'`, a plain `role=list`. A flex column that caps itself at its parent's height, so a long list
 * scrolls in its Content.
 */
const ListboxRoot = forwardRef<HTMLDivElement, ListboxRootProps>(
  (
    {
      classNames,
      items,
      selectionMode = 'single',
      value,
      defaultValue,
      onValueChange,
      deselectable,
      disabled,
      loopFocus,
      size,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const collection = useMemo(
      () =>
        createListCollection<ListboxOption>({
          items,
          itemToValue: (item) => item.value,
          itemToString: (item) => item.label,
          isItemDisabled: (item) => item.disabled ?? false,
        }),
      [items],
    );

    if (selectionMode === 'none') {
      return (
        <SelectableContext.Provider value={false}>
          <div
            {...props}
            data-scope='listbox'
            data-part='root'
            data-size={size}
            className={mx(recipes.listbox(), classNames)}
            ref={forwardedRef}
          >
            {children}
          </div>
        </SelectableContext.Provider>
      );
    }

    return (
      <SelectableContext.Provider value={true}>
        <ListboxPrimitive.Root<ListboxOption>
          {...props}
          collection={collection}
          selectionMode={selectionMode}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange && (({ value }) => onValueChange(value))}
          deselectable={deselectable}
          disabled={disabled}
          loopFocus={loopFocus}
          data-size={size}
          className={mx(recipes.listbox(), classNames)}
          ref={forwardedRef}
        >
          {children}
        </ListboxPrimitive.Root>
      </SelectableContext.Provider>
    );
  },
);

ListboxRoot.displayName = 'Next.Listbox.Root';

//
// Label
//

type ListboxLabelProps = ThemedClassName<ListboxPrimitive.LabelProps>;

/** Names the listbox (`aria-labelledby`); a plain list is named with `aria-label` on its Content instead. */
const ListboxLabel = forwardRef<HTMLLabelElement, ListboxLabelProps>(({ classNames, ...props }, forwardedRef) => (
  <ListboxPrimitive.Label {...props} className={mx(recipes.label(), classNames)} ref={forwardedRef} />
));

ListboxLabel.displayName = 'Next.Listbox.Label';

//
// Content
//

type ListboxContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Pick<ScrollAreaRootProps, 'mode' | 'width' | 'native'> &
  Pick<ContainerProps, 'gutter' | 'gap'> & {
    /**
     * `false` renders the rows without a ScrollArea of their own, for a host that already scrolls (`Panel.Body`):
     * the rows then inherit the host's rails (`gutter='inherit'` by default).
     */
    scroll?: boolean;
  };

/**
 * Ark's content as a composable part carrying Container's attributes, so the ScrollArea viewport slot merges onto it
 * (a plain Ark part gets the dev warning wrapper) and it stays the listbox element: zag scrolls the highlighted item
 * into view only when the listbox itself overflows.
 */
const ListboxViewport = composable<HTMLDivElement, ContainerProps & Omit<ComponentPropsWithoutRef<'div'>, 'className'>>(
  ({ gutter, gap, children, ...props }, forwardedRef) => {
    const selectable = useContext(SelectableContext);
    const { style, ...attributes } = containerAttributes({ gutter, gap });
    const {
      className,
      style: ownStyle,
      ...rest
    } = composableProps(props, {
      classNames: [recipes.container(), recipes.listboxContent()],
    });
    const shared = { ...rest, ...attributes, style: { ...style, ...ownStyle }, className };
    return selectable ? (
      <ListboxPrimitive.Content {...shared} data-scope='listbox' data-part='content' ref={forwardedRef}>
        {children}
      </ListboxPrimitive.Content>
    ) : (
      <div role='list' {...shared} data-scope='listbox' data-part='content' ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

/**
 * The rows, as the viewport of a thin overlay ScrollArea (decision 5) that grows to fill the Root; the listbox element
 * is a stack Container (`inset` gutter by default), so the thumb sits in its end gutter.
 */
const ListboxContent = forwardRef<HTMLDivElement, ListboxContentProps>(
  ({ classNames, mode, width, native, scroll = true, gutter, gap, onKeyDown, children, ...props }, forwardedRef) =>
    scroll ? (
      <ScrollArea.Root mode={mode} width={width} native={native} classNames={recipes.listboxScroll()}>
        <ScrollArea.Viewport asChild>
          <ListboxViewport
            {...props}
            onKeyDown={onKeyDown}
            gutter={gutter ?? 'inset'}
            gap={gap}
            classNames={classNames}
            ref={forwardedRef}
          >
            {children}
          </ListboxViewport>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    ) : (
      <ListboxViewport
        {...props}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // zag scrolls the highlighted row into view only when the listbox itself overflows; here the host scrolls.
          const content = event.currentTarget;
          requestAnimationFrame(() =>
            content.querySelector('[data-highlighted]')?.scrollIntoView({ block: 'nearest' }),
          );
        }}
        gutter={gutter ?? 'inherit'}
        gap={gap}
        classNames={classNames}
        ref={forwardedRef}
      >
        {children}
      </ListboxViewport>
    ),
);

ListboxContent.displayName = 'Next.Listbox.Content';

//
// Item
//

// The option an Item renders, so its parts default to the option's icon, label and description.
const ItemContext = createContext<ListboxOption | undefined>(undefined);

const useItem = (part: string) => {
  const item = useContext(ItemContext);
  if (!item) {
    throw new Error(`Next.Listbox.${part} must be inside Next.Listbox.Item`);
  }
  return item;
};

type ListboxItemProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children'>> & {
  item: ListboxOption;
  /** "You are here" (`aria-current`), distinct from selection. */
  current?: boolean;
  /** Pointer movement highlights the item, as the keyboard does. */
  highlightOnHover?: boolean;
  /** Replaces the whole row, composed from `ItemIcon`, `ItemText`, `ItemDescription`, `ItemIndicator` and controls. */
  children?: ReactNode;
};

/**
 * A row Container at least one block tall: without children, the option's icon, label and description; with them,
 * the caller's parts, which the theme places by part (icon cell, text over description, then trailing cells).
 * Selectable rows are Ark items (`option`, `aria-selected`); a plain list's are `listitem`s.
 */
const ListboxItem = forwardRef<HTMLDivElement, ListboxItemProps>(
  ({ classNames, item, current, highlightOnHover, children, style, ...props }, forwardedRef) => {
    const selectable = useContext(SelectableContext);
    // The template itself comes from the theme, which knows whether the row has an icon cell.
    const { style: columnsStyle, ...attributes } = containerAttributes({ columns: 'var(--nx-item-columns)' });
    const shared = {
      ...props,
      ...attributes,
      'aria-current': current ? ('true' as const) : undefined,
      'style': { ...columnsStyle, ...style },
      'className': mx(recipes.container(), recipes.listboxItem(), classNames),
    };
    const content = children ?? (
      <>
        {item.icon && <ListboxItemIcon />}
        <ListboxItemText />
        {item.description != null && <ListboxItemDescription />}
      </>
    );

    return (
      <ItemContext.Provider value={item}>
        {selectable ? (
          <ListboxPrimitive.Item
            {...shared}
            item={item}
            highlightOnHover={highlightOnHover}
            data-scope='listbox'
            data-part='item'
            ref={forwardedRef}
          >
            {content}
          </ListboxPrimitive.Item>
        ) : (
          <div role='listitem' {...shared} data-scope='listbox' data-part='item' ref={forwardedRef}>
            {content}
          </div>
        )}
      </ItemContext.Provider>
    );
  },
);

ListboxItem.displayName = 'Next.Listbox.Item';

//
// ItemIcon
//

type ListboxItemIconProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  /** Defaults to the option's `icon`. */
  icon?: string;
};

/** A block-sized leading cell, so the labels of every row start at the same x. */
const ListboxItemIcon = forwardRef<HTMLDivElement, ListboxItemIconProps>(
  ({ classNames, icon, children, ...props }, forwardedRef) => {
    const item = useItem('ItemIcon');
    const glyph = icon ?? item.icon;
    return (
      <div
        {...props}
        data-scope='listbox'
        data-part='item-icon'
        className={mx(recipes.block(), recipes.listboxItemIcon(), classNames)}
        ref={forwardedRef}
      >
        {children ?? (glyph && <Icon icon={glyph} />)}
      </div>
    );
  },
);

ListboxItemIcon.displayName = 'Next.Listbox.ItemIcon';

//
// ItemText
//

type ListboxItemTextProps = ThemedClassName<ComponentPropsWithoutRef<'p'>>;

/** The row's label, truncated to one line; the option's `label` by default, which typeahead matches either way. */
const ListboxItemText = forwardRef<HTMLParagraphElement, ListboxItemTextProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const item = useItem('ItemText');
    return (
      <p
        {...props}
        data-scope='listbox'
        data-part='item-text'
        data-truncate=''
        className={mx(recipes.typography(), recipes.listboxItemText(), classNames)}
        ref={forwardedRef}
      >
        {children ?? item.label}
      </p>
    );
  },
);

ListboxItemText.displayName = 'Next.Listbox.ItemText';

//
// ItemDescription
//

type ListboxItemDescriptionProps = ThemedClassName<ComponentPropsWithoutRef<'p'>>;

/** A second line under the text in `--color-description`; the option's `description` by default. */
const ListboxItemDescription = forwardRef<HTMLParagraphElement, ListboxItemDescriptionProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const item = useItem('ItemDescription');
    return (
      <p
        {...props}
        data-scope='listbox'
        data-part='item-description'
        data-truncate=''
        data-tone='description'
        className={mx(recipes.typography(), recipes.listboxItemDescription(), classNames)}
        ref={forwardedRef}
      >
        {children ?? item.description}
      </p>
    );
  },
);

ListboxItemDescription.displayName = 'Next.Listbox.ItemDescription';

//
// ItemIndicator
//

type ListboxItemIndicatorProps = ThemedClassName<ListboxPrimitive.ItemIndicatorProps>;

/** Shown while its item is selected: a check by default, in an icon-sized cell. */
const ListboxItemIndicator = forwardRef<HTMLDivElement, ListboxItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <ListboxPrimitive.ItemIndicator
      {...props}
      className={mx(recipes.listboxItemIndicator(), classNames)}
      ref={forwardedRef}
    >
      {children ?? <Icon icon='ph--check--regular' />}
    </ListboxPrimitive.ItemIndicator>
  ),
);

ListboxItemIndicator.displayName = 'Next.Listbox.ItemIndicator';

//
// ItemGroup
//

// Names a plain list's group, which has no Ark machine to wire its label.
const GroupLabelContext = createContext<string | undefined>(undefined);

type ListboxItemGroupProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/**
 * A `group` of items named by the `ItemGroupLabel` inside it; an inheriting Container, so its rows keep the list's
 * rails. Order groups as the Root's `items` are ordered, or keyboard order and reading order diverge.
 */
const ListboxItemGroup = forwardRef<HTMLDivElement, ListboxItemGroupProps>(
  ({ classNames, style, children, ...props }, forwardedRef) => {
    const selectable = useContext(SelectableContext);
    const labelId = useId();
    const { style: containerStyle, ...attributes } = containerAttributes({});
    const shared = {
      ...props,
      ...attributes,
      style: { ...containerStyle, ...style },
      className: mx(recipes.container(), classNames),
    };
    return selectable ? (
      <ListboxPrimitive.ItemGroup {...shared} data-scope='listbox' data-part='item-group' ref={forwardedRef}>
        {children}
      </ListboxPrimitive.ItemGroup>
    ) : (
      <GroupLabelContext.Provider value={labelId}>
        <div
          role='group'
          aria-labelledby={labelId}
          {...shared}
          data-scope='listbox'
          data-part='item-group'
          ref={forwardedRef}
        >
          {children}
        </div>
      </GroupLabelContext.Provider>
    );
  },
);

ListboxItemGroup.displayName = 'Next.Listbox.ItemGroup';

//
// ItemGroupLabel
//

type ListboxItemGroupLabelProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A small caption naming its group, like `Select.ItemGroupLabel`. */
const ListboxItemGroupLabel = forwardRef<HTMLDivElement, ListboxItemGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const selectable = useContext(SelectableContext);
    const labelId = useContext(GroupLabelContext);
    const className = mx(recipes.popupGroupLabel(), classNames);
    return selectable ? (
      <ListboxPrimitive.ItemGroupLabel
        {...props}
        data-scope='listbox'
        data-part='item-group-label'
        className={className}
        ref={forwardedRef}
      />
    ) : (
      <div
        id={labelId}
        {...props}
        data-scope='listbox'
        data-part='item-group-label'
        className={className}
        ref={forwardedRef}
      />
    );
  },
);

ListboxItemGroupLabel.displayName = 'Next.Listbox.ItemGroupLabel';

export const Listbox = {
  Root: ListboxRoot,
  Label: ListboxLabel,
  Content: ListboxContent,
  Item: ListboxItem,
  ItemIcon: ListboxItemIcon,
  ItemText: ListboxItemText,
  ItemDescription: ListboxItemDescription,
  ItemIndicator: ListboxItemIndicator,
  ItemGroup: ListboxItemGroup,
  ItemGroupLabel: ListboxItemGroupLabel,
};

export type {
  ListboxContentProps,
  ListboxItemDescriptionProps,
  ListboxItemGroupLabelProps,
  ListboxItemGroupProps,
  ListboxItemIconProps,
  ListboxItemIndicatorProps,
  ListboxItemProps,
  ListboxItemTextProps,
  ListboxLabelProps,
  ListboxRootProps,
};
