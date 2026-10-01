//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Listbox as ListboxPrimitive, type UseListboxContext, useListboxContext } from '@ark-ui/react/listbox';
import React, {
  Children,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type ContainerProps, containerAttributes } from '../Container/index.ts';
import { Empty } from '../Empty/index.ts';
import { Icon, type IconProps } from '../Icon/index.ts';
import { ScrollArea, type ScrollAreaRootProps } from '../ScrollArea/index.ts';
import { RowContext, handleGridKeyDown, isFromControl, useRowTabStops } from './grid.ts';
import { type VirtualMode, VirtualSpacer, useVirtualRows } from './virtual.tsx';

export type ListboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Leading icon of the default row. */
  icon?: string;
  /** Second line of the default row. */
  description?: string;
};

/** `none` keeps zag's focus, keyboard and typeahead with no selection (AUDIT §6 group B: every list runs the machine). */
export type ListboxSelectionMode = 'single' | 'multiple' | 'none';

type RootContextValue = {
  items: readonly ListboxOption[];
  selectionMode: ListboxSelectionMode;
  columns?: string;
  virtual?: VirtualMode;
  /** Set by Content when it windows its rows; zag calls it to bring a highlighted row it has not mounted into view. */
  scrollToIndexRef: RefObject<((index: number) => void) | null>;
};

const RootContext = createContext<RootContextValue | undefined>(undefined);

const useRootContext = (part: string) => {
  const context = useContext(RootContext);
  if (!context) {
    throw new Error(`Next.Listbox.${part} must be inside Next.Listbox.Root`);
  }
  return context;
};

//
// Root
//

type ListboxRootProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onSelect'>> & {
  items: readonly ListboxOption[];
  /** `single` by default; `multiple` toggles each item; `none` selects nothing but keeps navigation and typeahead. */
  selectionMode?: ListboxSelectionMode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Clicking the selected item of a single-selection list clears it. */
  deselectable?: boolean;
  disabled?: boolean;
  /** Arrow keys wrap from the last item to the first and back. */
  loopFocus?: boolean;
  /**
   * Custom tracks for every row, declared once: rows become subgrids of these columns and place their children in
   * order. Without it rows lay out by part (a leading cell, the text over its description, trailing parts).
   */
  columns?: string;
  /** Long lists: `fixed` windows equal-height rows, `variable` defers off-screen rows (`content-visibility`). */
  virtual?: VirtualMode;
  size?: Size;
};

/**
 * Ark listbox: single, multiple or no selection, with keyboard navigation, typeahead and `aria-selected` from zag. A
 * flex column that caps itself at its parent's height, so a long list scrolls in its Content.
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
      columns,
      virtual,
      size,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const collection = useMemo(
      () =>
        createListCollection<ListboxOption>({
          items: [...items],
          itemToValue: (item) => item.value,
          itemToString: (item) => item.label,
          isItemDisabled: (item) => item.disabled ?? false,
        }),
      [items],
    );
    const scrollToIndexRef = useRef<((index: number) => void) | null>(null);
    const context = useMemo<RootContextValue>(
      () => ({ items, selectionMode, columns, virtual, scrollToIndexRef }),
      [items, selectionMode, columns, virtual],
    );

    return (
      <RootContext.Provider value={context}>
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
          scrollToIndexFn={virtual === 'fixed' ? ({ index }) => scrollToIndexRef.current?.(index) : undefined}
          data-size={size}
          className={mx(recipes.listbox(), classNames)}
          ref={forwardedRef}
        >
          {children}
        </ListboxPrimitive.Root>
      </RootContext.Provider>
    );
  },
);

ListboxRoot.displayName = 'Next.Listbox.Root';

//
// Label
//

type ListboxLabelProps = ThemedClassName<ListboxPrimitive.LabelProps>;

/** Names the list (`aria-labelledby` on its Content). */
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
 * The listbox element: zag's content props with the grid keyboard in front of them, a Container's attributes so the
 * ScrollArea viewport slot merges onto it, and the Root's `virtual` windowing over its direct children (the rows).
 */
const ListboxViewport = composable<
  HTMLDivElement,
  ContainerProps & Omit<ComponentPropsWithoutRef<'div'>, 'className'> & { hostScrolls?: boolean }
>(({ gutter, gap, hostScrolls, onKeyDown, onFocus, onBlur, children, ...props }, forwardedRef) => {
  const api = useListboxContext();
  const { columns, virtual, scrollToIndexRef } = useRootContext('Content');
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const rows = Children.toArray(children);
  const windowing = useVirtualRows({ mode: virtual, count: rows.length });
  scrollToIndexRef.current = virtual === 'fixed' ? windowing.scrollToIndex : null;
  const ref = useComposedRefs<HTMLDivElement>(forwardedRef, setElement, windowing.listRef);
  useRowTabStops(element);

  const { style, ...attributes } = containerAttributes({ gutter, gap, columns });
  const {
    className,
    style: ownStyle,
    ...rest
  } = composableProps(props, {
    classNames: [recipes.container(), recipes.listboxContent()],
  });
  const contentProps = api.getContentProps();
  return (
    <div
      {...contentProps}
      {...rest}
      {...attributes}
      data-scope='listbox'
      data-part='content'
      data-virtual={virtual}
      style={{ ...contentProps.style, ...style, ...ownStyle }}
      className={className}
      onFocus={(event) => {
        contentProps.onFocus?.(event);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        contentProps.onBlur?.(event);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented && event.target === event.currentTarget) {
          return;
        }
        if (handleGridKeyDown(event)) {
          return;
        }
        contentProps.onKeyDown?.(event);
        if (hostScrolls && virtual !== 'fixed') {
          // zag scrolls the highlighted row into view only when the listbox itself overflows; here the host scrolls.
          const content = event.currentTarget;
          requestAnimationFrame(() =>
            content.querySelector('[data-highlighted]')?.scrollIntoView({ block: 'nearest' }),
          );
        }
      }}
      ref={ref}
    >
      {virtual === 'fixed' ? (
        <>
          <VirtualSpacer height={windowing.before} />
          {rows.slice(windowing.first, windowing.last + 1)}
          <VirtualSpacer height={windowing.after} />
        </>
      ) : (
        children
      )}
    </div>
  );
});

/**
 * The rows, as the viewport of a thin overlay ScrollArea (decision 5) that grows to fill the Root; the listbox element
 * is a stack Container (`inset` gutter by default), so the thumb sits in its end gutter. With Root `virtual='fixed'`
 * only the rows in view mount: give Content the rows as its direct children.
 */
const ListboxContent = forwardRef<HTMLDivElement, ListboxContentProps>(
  ({ classNames, mode, width, native, scroll = true, gutter, gap, children, ...props }, forwardedRef) =>
    scroll ? (
      <ScrollArea.Root mode={mode} width={width} native={native} classNames={recipes.listboxScroll()}>
        <ScrollArea.Viewport asChild>
          <ListboxViewport {...props} gutter={gutter ?? 'inset'} gap={gap} classNames={classNames} ref={forwardedRef}>
            {children}
          </ListboxViewport>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    ) : (
      <ListboxViewport
        {...props}
        hostScrolls
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
// Empty
//

type ListboxEmptyProps = ComponentPropsWithoutRef<typeof Empty>;

/** `Next.Empty`, rendered only while the Root has no items. */
const ListboxEmpty = forwardRef<HTMLDivElement, ListboxEmptyProps>((props, forwardedRef) => {
  const { items } = useRootContext('Empty');
  return items.length === 0 ? <Empty {...props} ref={forwardedRef} /> : null;
});

ListboxEmpty.displayName = 'Next.Listbox.Empty';

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
 * A row (`option`) at least one block tall: without children, the option's icon, label and description; with them,
 * the caller's parts, which the theme places by part (leading cells, text over description, then trailing cells) or,
 * under Root `columns`, in order across the shared tracks. Pointer presses on a row control stay with the control: they
 * neither select the row nor take focus from the control.
 */
const ListboxItem = forwardRef<HTMLDivElement, ListboxItemProps>(
  (
    { classNames, item, current, highlightOnHover, children, style, onMouseDown, onClick, onFocus, ...props },
    forwardedRef,
  ) => {
    const api = useListboxContext();
    const { columns, selectionMode } = useRootContext('Item');
    const textId = useId();
    const row = useMemo(() => ({ textId }), [textId]);
    // Under Root `columns` the row is a subgrid of the Content's tracks (theme); otherwise it has its own template.
    const { style: columnsStyle, ...attributes } = containerAttributes(
      columns ? {} : { columns: 'var(--nx-item-columns)' },
    );
    const itemProps = api.getItemProps({ item, highlightOnHover });
    const content = children ?? (
      <>
        {item.icon && <ListboxItemIcon />}
        <ListboxItemText />
        {item.description != null && <ListboxItemDescription />}
      </>
    );

    return (
      <ItemContext.Provider value={item}>
        <RowContext.Provider value={row}>
          <div
            {...itemProps}
            {...props}
            {...attributes}
            aria-current={current ? 'true' : undefined}
            data-scope='listbox'
            data-part='item'
            data-selectable={selectionMode === 'none' ? undefined : ''}
            style={{ ...columnsStyle, ...style }}
            className={mx(recipes.container(), recipes.row(), recipes.listboxItem(), classNames)}
            onMouseDown={(event) => {
              onMouseDown?.(event);
              if (!isFromControl(event.currentTarget, event.target)) {
                itemProps.onMouseDown?.(event);
              }
            }}
            onClick={(event) => {
              onClick?.(event);
              if (!isFromControl(event.currentTarget, event.target)) {
                itemProps.onClick?.(event);
              }
            }}
            onFocus={(event) => {
              onFocus?.(event);
              // A row control took focus (a click or the grid keyboard): the row is the list's current row.
              if (event.target !== event.currentTarget && api.highlightedValue !== item.value) {
                api.highlightValue(item.value);
              }
            }}
            ref={forwardedRef}
          >
            {content}
          </div>
        </RowContext.Provider>
      </ItemContext.Provider>
    );
  },
);

ListboxItem.displayName = 'Next.Listbox.Item';

//
// ItemIcon
//

type ListboxItemIconProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Partial<Pick<IconProps, 'icon' | 'hue' | 'valence' | 'label'>>;

/** A block-sized leading cell, so the labels of every row start at the same x; `hue` and the rest reach the Icon. */
const ListboxItemIcon = forwardRef<HTMLDivElement, ListboxItemIconProps>(
  ({ classNames, icon, hue, valence, label, children, ...props }, forwardedRef) => {
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
        {children ?? (glyph && <Icon icon={glyph} hue={hue} valence={valence} label={label} />)}
      </div>
    );
  },
);

ListboxItemIcon.displayName = 'Next.Listbox.ItemIcon';

//
// ItemText
//

type ListboxItemTextProps = ThemedClassName<ComponentPropsWithoutRef<'p'>> & {
  /** `description` reads as secondary text, as Typography's tone. */
  tone?: 'default' | 'description';
};

/**
 * The row's label, truncated to one line; the option's `label` by default, which typeahead matches either way. Its id
 * names the row's controls (a Remove button, a disclosure caret).
 */
const ListboxItemText = forwardRef<HTMLParagraphElement, ListboxItemTextProps>(
  ({ classNames, tone, children, ...props }, forwardedRef) => {
    const item = useItem('ItemText');
    const row = useContext(RowContext);
    return (
      <p
        id={row?.textId}
        {...props}
        data-scope='listbox'
        data-part='item-text'
        data-truncate=''
        data-tone={tone === 'description' ? tone : undefined}
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

type ListboxItemIndicatorProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** Shown while its item is selected: a check by default, in an icon-sized cell. */
const ListboxItemIndicator = forwardRef<HTMLDivElement, ListboxItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const api = useListboxContext();
    const item = useItem('ItemIndicator');
    return (
      <div
        {...api.getItemIndicatorProps({ item })}
        {...props}
        className={mx(recipes.listboxItemIndicator(), classNames)}
        ref={forwardedRef}
      >
        {children ?? <Icon icon='ph--check--regular' />}
      </div>
    );
  },
);

ListboxItemIndicator.displayName = 'Next.Listbox.ItemIndicator';

//
// ItemGroup
//

type ListboxItemGroupProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/**
 * A `group` of items named by the `ItemGroupLabel` inside it; an inheriting Container, so its rows keep the list's
 * rails. Order groups as the Root's `items` are ordered, or keyboard order and reading order diverge.
 */
const ListboxItemGroup = forwardRef<HTMLDivElement, ListboxItemGroupProps>(
  ({ classNames, style, children, ...props }, forwardedRef) => {
    const { style: containerStyle, ...attributes } = containerAttributes({});
    return (
      <ListboxPrimitive.ItemGroup
        {...props}
        {...attributes}
        style={{ ...containerStyle, ...style }}
        className={mx(recipes.container(), classNames)}
        data-scope='listbox'
        data-part='item-group'
        ref={forwardedRef}
      >
        {children}
      </ListboxPrimitive.ItemGroup>
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
  ({ classNames, ...props }, forwardedRef) => (
    <ListboxPrimitive.ItemGroupLabel
      {...props}
      data-scope='listbox'
      data-part='item-group-label'
      className={mx(recipes.popupGroupLabel(), classNames)}
      ref={forwardedRef}
    />
  ),
);

ListboxItemGroupLabel.displayName = 'Next.Listbox.ItemGroupLabel';

//
// useContext
//

type ListboxContext = UseListboxContext<ListboxOption>;

/** Ark's listbox api (`value`, `selectedItems`, `setValue`, `clearValue`, …) for parts inside the Root, e.g. a detail pane. */
const useListboxRootContext = (): ListboxContext => useListboxContext();

export const Listbox = {
  Root: ListboxRoot,
  Label: ListboxLabel,
  Content: ListboxContent,
  Empty: ListboxEmpty,
  Item: ListboxItem,
  ItemIcon: ListboxItemIcon,
  ItemText: ListboxItemText,
  ItemDescription: ListboxItemDescription,
  ItemIndicator: ListboxItemIndicator,
  ItemGroup: ListboxItemGroup,
  ItemGroupLabel: ListboxItemGroupLabel,
  useContext: useListboxRootContext,
};

export type {
  ListboxContentProps,
  ListboxContext,
  ListboxEmptyProps,
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
