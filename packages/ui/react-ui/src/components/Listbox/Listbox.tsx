//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { createGridCollection, createListCollection } from '@ark-ui/react/collection';
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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { composable, composableProps } from '../../util/slots.ts';
import { type ContainerProps, containerAttributes } from '../Container/Container.tsx';
import { Empty } from '../Empty/Empty.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as ScrollArea from '../ScrollArea/ScrollArea.tsx';
import { RowContext, handleGridKeyDown, isFromControl, useRowTabStops } from './grid.ts';
import { type VirtualMode, VirtualSpacer, isWindowed, useVirtualRows } from './virtual.tsx';

type ListboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /** Leading icon of the default row. */
  icon?: string;
  /** Second line of the default row. */
  description?: string;
};

/** `none` keeps zag's focus, keyboard and typeahead with no selection (AUDIT §6 group B: every list runs the machine). */
type ListboxSelectionMode = 'single' | 'multiple' | 'extended' | 'none';

/** Bounds of a responsive tile's width, in pixels. */
export type TileWidth = { min: number; max?: number };

type RootContextValue = {
  items: readonly ListboxOption[];
  selectionMode: ListboxSelectionMode;
  columns?: string;
  /** Whether items lay out as tiles (a fixed `tiles` count or an auto-fill `tileWidth`). */
  tiled: boolean;
  tiles?: number;
  tileWidth?: TileWidth;
  /** Set by Content from the columns it renders under `tileWidth`, so the arrow keys move by what is on screen. */
  setColumnCount: (count: number) => void;
  virtual?: VirtualMode;
  /** Set by Content when it windows its rows; zag calls it to bring a highlighted row it has not mounted into view. */
  scrollToIndexRef: RefObject<((index: number) => void) | null>;
};

const RootContext = createContext<RootContextValue | undefined>(undefined);

const useRootContext = (part: string) => {
  const context = useContext(RootContext);
  if (!context) {
    throw new Error(`Listbox.${part} must be inside Listbox.Root`);
  }
  return context;
};

//
// Root
//

type ListboxRootProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onSelect'>> & {
  items: readonly ListboxOption[];
  /**
   * `single` by default; `multiple` toggles each item; `extended` selects one on a click and adds with Cmd/Ctrl or a
   * Shift range, as a desktop list does; `none` selects nothing but keeps navigation and typeahead.
   */
  selectionMode?: ListboxSelectionMode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** The row keyboard or pointer navigation moved to (null when none). */
  onHighlightChange?: (value: string | null) => void;
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
  /**
   * Lays the items out as tiles in this many equal columns (a gallery, a thumbnail picker); the arrow keys then move
   * across and down. Items keep the row states (hover, highlight, selection) but not the row's part layout.
   */
  tiles?: number;
  /**
   * Lays the items out as tiles between `min` and `max` pixels wide (`max` defaults to filling the row): as many columns
   * as fit at `min`, each as wide as the row allows up to `max`. The grid reflows as its container resizes, and the
   * arrow keys move by the columns on screen. Ignored with `tiles`.
   */
  tileWidth?: TileWidth;
  /**
   * Long lists: `fixed` windows equal-height rows, `measured` windows rows of any height, `variable` defers off-screen
   * rows (`content-visibility`). Ignored for `tiles`.
   */
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
      onHighlightChange,
      deselectable,
      disabled,
      loopFocus,
      columns,
      tiles,
      tileWidth: tileWidthProp,
      virtual: virtualProp,
      size,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const tileWidth = tiles ? undefined : tileWidthProp;
    const tiled = !!tiles || !!tileWidth;
    const [columnCount, setColumnCount] = useState(1);
    // Windowing counts rows of one item each, which a tile grid does not have.
    const virtual = tiled ? undefined : virtualProp;
    const collection = useMemo(() => {
      const options = {
        items: [...items],
        itemToValue: (item: ListboxOption) => item.value,
        itemToString: (item: ListboxOption) => item.label,
        isItemDisabled: (item: ListboxOption) => item.disabled ?? false,
      };
      // A grid collection gives zag the column count it moves by on ArrowUp and ArrowDown.
      return tiled
        ? createGridCollection<ListboxOption>({ ...options, columnCount: tiles ?? columnCount })
        : createListCollection<ListboxOption>(options);
    }, [items, tiled, tiles, columnCount]);
    const scrollToIndexRef = useRef<((index: number) => void) | null>(null);
    const context = useMemo<RootContextValue>(
      () => ({ items, selectionMode, columns, tiled, tiles, tileWidth, setColumnCount, virtual, scrollToIndexRef }),
      [items, selectionMode, columns, tiled, tiles, tileWidth, virtual],
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
          onHighlightChange={onHighlightChange && (({ highlightedValue }) => onHighlightChange(highlightedValue))}
          deselectable={deselectable}
          disabled={disabled}
          loopFocus={loopFocus}
          scrollToIndexFn={isWindowed(virtual) ? ({ index }) => scrollToIndexRef.current?.(index) : undefined}
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

ListboxRoot.displayName = 'Listbox.Root';

//
// Label
//

type ListboxLabelProps = ThemedClassName<ListboxPrimitive.LabelProps>;

/** Names the list (`aria-labelledby` on its Content). */
const ListboxLabel = forwardRef<HTMLLabelElement, ListboxLabelProps>(({ classNames, ...props }, forwardedRef) => (
  <ListboxPrimitive.Label {...props} className={mx(recipes.label(), classNames)} ref={forwardedRef} />
));

ListboxLabel.displayName = 'Listbox.Label';

//
// Viewport
//

/** True under a `Listbox.Viewport`: the list scrolls itself rather than in its host. */
const ViewportContext = createContext(false);

type ListboxViewportProps = ThemedClassName<Pick<ScrollArea.RootProps, 'mode' | 'width' | 'native'>> & {
  /** The `Listbox.Content`, which becomes the scrolling element. */
  children: ReactNode;
};

/**
 * A thin overlay ScrollArea (decision 5) that grows to fill the Root, for a list that owns its scrolling (a picker, a
 * fixed-height panel). Its `Content` is the scrolling element, so the thumb sits in the Content's end gutter. Omit it
 * inside a host that already scrolls, which would otherwise trap wheel and trackpad gestures in a nested scroller.
 */
const ListboxViewport = forwardRef<HTMLDivElement, ListboxViewportProps>(
  ({ classNames, mode, width, native, children }, forwardedRef) => (
    <ViewportContext.Provider value={true}>
      <ScrollArea.Root
        mode={mode}
        width={width}
        native={native}
        classNames={[recipes.listboxScroll(), classNames]}
        ref={forwardedRef}
      >
        <ScrollArea.Viewport asChild>{children}</ScrollArea.Viewport>
      </ScrollArea.Root>
    </ViewportContext.Provider>
  ),
);

ListboxViewport.displayName = 'Listbox.Viewport';

//
// Content
//

type ListboxContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Pick<ContainerProps, 'gutter' | 'gap' | 'padBlock'>;

/**
 * Sizes a `tileWidth` grid: the columns that fit at the minimum width, written to the content's `--dx-tile-count` from
 * the resize callback (before paint, so the layout never lags its container) and reported for the arrow keys. CSS alone
 * cannot do this: `auto-fill` counts columns by a definite maximum, so tiles could never shrink below it.
 */
const useAutoColumns = (
  element: HTMLElement | null,
  tileWidth: TileWidth | undefined,
  setColumnCount: (count: number) => void,
) => {
  const min = tileWidth?.min;
  useLayoutEffect(() => {
    if (!element || !min) {
      return;
    }
    const measure = () => {
      const style = getComputedStyle(element);
      const width = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = parseFloat(style.columnGap) || 0;
      const count = Math.max(1, Math.floor((width + gap) / (min + gap)));
      element.style.setProperty('--dx-tile-count', String(count));
      setColumnCount(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, min, setColumnCount]);
};

/**
 * The listbox element: zag's content props with the grid keyboard in front of them, a Container's attributes so a
 * `Viewport`'s slot merges onto it, and the Root's `virtual` windowing over its direct children (the rows). Under a
 * `Viewport` it is the scrolling element (`inset` gutter by default); otherwise its host scrolls and the rows inherit the
 * host's rails (`inherit`). A windowed (`virtual`) list measures its scroller, so it needs a `Viewport`.
 */
const ListboxContent = composable<HTMLDivElement, ContainerProps & Omit<ComponentPropsWithoutRef<'div'>, 'className'>>(
  ({ gutter, gap, padBlock, onKeyDown, onFocus, onBlur, children, ...props }, forwardedRef) => {
    const api = useListboxContext();
    const { columns, tiled, tileWidth, setColumnCount, virtual, scrollToIndexRef } = useRootContext('Content');
    const inViewport = useContext(ViewportContext);
    const [element, setElement] = useState<HTMLDivElement | null>(null);
    const rows = Children.toArray(children);
    const windowing = useVirtualRows({ mode: virtual, count: rows.length });
    scrollToIndexRef.current = isWindowed(virtual) ? windowing.scrollToIndex : null;
    const ref = useComposedRefs<HTMLDivElement>(forwardedRef, setElement, windowing.listRef);
    useRowTabStops(element);
    useAutoColumns(element, tileWidth, setColumnCount);

    const { style, ...attributes } = containerAttributes({
      gutter: gutter ?? (inViewport ? 'inset' : 'inherit'),
      gap,
      columns,
      padBlock,
    });
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
        data-tiles={tileWidth ? 'auto' : tiled ? '' : undefined}
        style={{
          ...contentProps.style,
          ...style,
          ...(tileWidth?.max ? { '--dx-tile-max': `${tileWidth.max}px` } : {}),
          ...ownStyle,
        }}
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
          // Tiles move across with ArrowLeft and ArrowRight, which the row keyboard would take to enter a row's controls.
          if (!tiled && handleGridKeyDown(event)) {
            return;
          }
          contentProps.onKeyDown?.(event);
          if (!inViewport && !isWindowed(virtual)) {
            // zag scrolls the highlighted row into view only when the listbox itself overflows; here the host scrolls.
            const content = event.currentTarget;
            requestAnimationFrame(() =>
              content.querySelector('[data-highlighted]')?.scrollIntoView({ block: 'nearest' }),
            );
          }
        }}
        ref={ref}
      >
        {isWindowed(virtual) ? (
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
  },
);

ListboxContent.displayName = 'Listbox.Content';

/** True inside a `Listbox.Viewport`, for parts that act on the scrolling element (e.g. drag auto-scroll). */
const useListboxViewport = (): boolean => useContext(ViewportContext);

//
// Empty
//

type ListboxEmptyProps = ComponentPropsWithoutRef<typeof Empty>;

/** `Empty`, rendered only while the Root has no items. */
const ListboxEmpty = forwardRef<HTMLDivElement, ListboxEmptyProps>((props, forwardedRef) => {
  const { items } = useRootContext('Empty');
  return items.length === 0 ? <Empty {...props} ref={forwardedRef} /> : null;
});

ListboxEmpty.displayName = 'Listbox.Empty';

//
// Item
//

// The option an Item renders, so its parts default to the option's icon, label and description.
const ItemContext = createContext<ListboxOption | undefined>(undefined);

const useItem = (part: string) => {
  const item = useContext(ItemContext);
  if (!item) {
    throw new Error(`Listbox.${part} must be inside Listbox.Item`);
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
    const { columns, tiled, selectionMode } = useRootContext('Item');
    const textId = useId();
    const row = useMemo(() => ({ textId }), [textId]);
    // Under Root `columns` the row is a subgrid of the Content's tracks (theme); otherwise it has its own template.
    // A tile is laid out by the theme as a column of its parts, so it takes no row template.
    const { style: columnsStyle, ...attributes } = containerAttributes(
      columns || tiled ? {} : { columns: 'var(--dx-item-columns)' },
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
            className={mx(
              tiled
                ? [recipes.row(), recipes.listboxTile()]
                : [recipes.container(), recipes.row(), recipes.listboxItem()],
              classNames,
            )}
            onMouseDown={(event) => {
              onMouseDown?.(event);
              if (isFromControl(event.currentTarget, event.target)) {
                return;
              }
              // Zag cancels the press to keep focus on the list, which would also stop the native drag of a row that is its
              // own drag handle (`data-drag-row`, set by useReorder); such a row moves focus to the list itself instead.
              if (event.currentTarget.hasAttribute('data-drag-row')) {
                event.currentTarget.closest<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });
              } else {
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

ListboxItem.displayName = 'Listbox.Item';

//
// ItemIcon
//

type ListboxItemIconProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> &
  Partial<Pick<Icon.IconProps, 'icon' | 'hue' | 'valence' | 'label'>>;

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
        {children ?? (glyph && <Icon.Icon icon={glyph} hue={hue} valence={valence} label={label} />)}
      </div>
    );
  },
);

ListboxItemIcon.displayName = 'Listbox.ItemIcon';

//
// ItemText
//

type ListboxItemTextProps = ThemedClassName<ComponentPropsWithoutRef<'p'>> & {
  /** `muted` reads as secondary text, as Typography's tone. */
  tone?: 'default' | 'muted';
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
        data-tone={tone === 'muted' ? tone : undefined}
        className={mx(recipes.typography(), recipes.listboxItemText(), classNames)}
        ref={forwardedRef}
      >
        {children ?? item.label}
      </p>
    );
  },
);

ListboxItemText.displayName = 'Listbox.ItemText';

//
// ItemDescription
//

type ListboxItemDescriptionProps = ThemedClassName<ComponentPropsWithoutRef<'p'>>;

/** A second line under the text in `--color-fg-muted`; the option's `description` by default. */
const ListboxItemDescription = forwardRef<HTMLParagraphElement, ListboxItemDescriptionProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const item = useItem('ItemDescription');
    return (
      <p
        {...props}
        data-scope='listbox'
        data-part='item-description'
        data-truncate=''
        data-tone='muted'
        className={mx(recipes.typography(), recipes.listboxItemDescription(), classNames)}
        ref={forwardedRef}
      >
        {children ?? item.description}
      </p>
    );
  },
);

ListboxItemDescription.displayName = 'Listbox.ItemDescription';

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
        {children ?? <Icon.Icon icon='ph--check--regular' />}
      </div>
    );
  },
);

ListboxItemIndicator.displayName = 'Listbox.ItemIndicator';

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

ListboxItemGroup.displayName = 'Listbox.ItemGroup';

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

ListboxItemGroupLabel.displayName = 'Listbox.ItemGroupLabel';

//
// useContext
//

type ListboxContext = UseListboxContext<ListboxOption>;

/** Ark's listbox api (`value`, `selectedItems`, `setValue`, `clearValue`, …) for parts inside the Root, e.g. a detail pane. */
const useListboxRootContext = (): ListboxContext => useListboxContext();
export type {
  ListboxContentProps as ContentProps,
  ListboxContext as Context,
  ListboxEmptyProps as EmptyProps,
  ListboxItemDescriptionProps as ItemDescriptionProps,
  ListboxItemGroupLabelProps as ItemGroupLabelProps,
  ListboxItemGroupProps as ItemGroupProps,
  ListboxItemIconProps as ItemIconProps,
  ListboxItemIndicatorProps as ItemIndicatorProps,
  ListboxItemProps as ItemProps,
  ListboxItemTextProps as ItemTextProps,
  ListboxLabelProps as LabelProps,
  ListboxRootProps as RootProps,
  ListboxViewportProps as ViewportProps,
};

export {
  ListboxContent as Content,
  ListboxEmpty as Empty,
  ListboxItem as Item,
  ListboxItemDescription as ItemDescription,
  ListboxItemGroup as ItemGroup,
  ListboxItemGroupLabel as ItemGroupLabel,
  ListboxItemIcon as ItemIcon,
  ListboxItemIndicator as ItemIndicator,
  ListboxItemText as ItemText,
  ListboxLabel as Label,
  ListboxRoot as Root,
  ListboxViewport as Viewport,
  useListboxRootContext as useContext,
  useListboxViewport as useViewport,
};
export type { ListboxOption as Option, ListboxSelectionMode as SelectionMode };
export { RowContext, type RowContextValue } from './grid.ts';
export * from './virtual.tsx';
