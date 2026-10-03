//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Combobox as ComboboxPrimitive, useComboboxContext } from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ComponentPropsWithoutRef,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { createContext as createRootContext, useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon, type IconProps } from '../Icon/index.ts';
import { PopupScroll, popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';
import { type SelectOption } from '../Select/index.ts';

/** Gap between control and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

/** The value of the create row's option, which the Root appends to the collection and never selects. */
const CREATE_VALUE = '\u0000nx-combobox-create';

export type ComboboxOption = SelectOption & {
  /** A second line under the label, in the description tone. */
  description?: string;
};

export type ComboboxFilter = (option: ComboboxOption, query: string) => boolean;

/** Case-insensitive substring match on the label. */
const containsFilter: ComboboxFilter = (option, query) => option.label.toLowerCase().includes(query.toLowerCase());

//
// Root
//

type ComboboxRootContextValue = {
  /** The text typed into the input (a selection or clear does not count). */
  query: string;
  loading: boolean;
  /** The create row's option, while there is one. */
  create?: ComboboxOption;
  /** The create row's text for a query and its icon, when the Root overrides the defaults. */
  createLabel?: (query: string) => string;
  createIcon?: string;
  /** Whether the input is the popup's search field (a button `Trigger` or an `Input` inside `Content`). */
  search: boolean;
  registerTrigger: (present: boolean) => void;
  registerSearch: (present: boolean) => void;
};

const [ComboboxRootProvider, useComboboxRootContext] = createRootContext<ComboboxRootContextValue>('Next.Combobox');

type ComboboxRootProps = ThemedClassName<Omit<ComboboxPrimitive.RootProps<ComboboxOption>, 'collection'>> & {
  items: ComboboxOption[];
  /**
   * Keeps an option while the user types `query`; defaults to a case-insensitive substring match on the label. `null`
   * keeps every item, for results the caller loads for the query (`onInputValueChange`).
   */
  filter?: ComboboxFilter | null;
  /** Results are loading: the popup shows a spinner row instead of its empty state, and the button trigger is busy. */
  loading?: boolean;
  /** Offers a create row while the typed query matches no label exactly; choosing it calls this instead of selecting. */
  onCreate?: (query: string) => void;
  /** The create row's text for the query (e.g. `Add tag “{query}”`); `Create “{query}”` by default. */
  createLabel?: (query: string) => string;
  /** The create row's icon; a plus by default. */
  createIcon?: string;
};

/**
 * Ark combobox over a flat option list, filtered as the user types; the root takes no box, like Select's. The input
 * sits in a Control beside a caret, or, with a button `Trigger` (or an `Input` placed in `Content`), in the popup.
 */
const ComboboxRoot = forwardRef<HTMLDivElement, ComboboxRootProps>(
  (
    {
      classNames,
      items,
      filter = containsFilter,
      loading = false,
      onCreate,
      createLabel,
      createIcon,
      positioning,
      lazyMount = true,
      unmountOnExit = true,
      inputBehavior = 'autohighlight',
      loopFocus = false,
      composite,
      selectionBehavior,
      value: valueProp,
      defaultValue,
      onValueChange,
      onInputValueChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const [query, setQuery] = useState('');
    const [trigger, registerTrigger] = useState(false);
    const [searchInput, registerSearch] = useState(false);
    const search = trigger || searchInput;

    const create = useMemo<ComboboxOption | undefined>(() => {
      const text = query.trim();
      if (!onCreate || !text || items.some((item) => item.label.toLowerCase() === text.toLowerCase())) {
        return undefined;
      }

      return { value: CREATE_VALUE, label: text };
    }, [items, query, onCreate]);

    const collection = useMemo(() => {
      const matches = filter && query ? items.filter((item) => filter(item, query)) : items;
      return createListCollection<ComboboxOption>({ items: create ? [...matches, create] : matches });
    }, [items, filter, query, create]);

    // Controlled, so choosing the create row never becomes the value.
    const [uncontrolled, setUncontrolled] = useState<string[]>(defaultValue ?? []);
    const value = valueProp ?? uncontrolled;

    return (
      <ComboboxPrimitive.Root
        {...props}
        // Mounting the popup on open keeps it out of a modal Dialog's one-time `aria-hidden` sweep of its siblings.
        lazyMount={lazyMount}
        unmountOnExit={unmountOnExit}
        // zag pins the popup to its anchor's width by default; like Select's, it is at least that wide and grows to its
        // options (a virtual anchor such as a caret can be a few pixels wide), keeping its start edge on the anchor.
        positioning={popupPositioning(POPUP_GUTTER, { sameWidth: false, placement: 'bottom-start', ...positioning })}
        // Typing highlights the first match, so Enter picks it without an arrow key first.
        inputBehavior={inputBehavior}
        // Arrow keys stop at the first and last option rather than wrapping, as in Select and Listbox.
        loopFocus={loopFocus}
        // A popup holding the search field is a dialog around a `List` listbox, since a listbox cannot hold an input.
        composite={composite ?? !search}
        // The search field starts empty each time; the button trigger shows the value.
        selectionBehavior={selectionBehavior ?? (search ? 'clear' : 'replace')}
        collection={collection}
        value={value}
        onValueChange={(details) => {
          if (details.value.includes(CREATE_VALUE)) {
            onCreate?.(query.trim());
            return;
          }

          setUncontrolled(details.value);
          onValueChange?.(details);
        }}
        onInputValueChange={(details) => {
          // Only typing narrows the list; a selection or clear fills the input but reopening should show every option.
          setQuery(details.reason === 'input-change' ? details.inputValue : '');
          onInputValueChange?.(details);
        }}
        className={mx(recipes.combobox(), classNames)}
        ref={forwardedRef}
      >
        <ComboboxRootProvider
          query={query}
          loading={loading}
          create={create}
          createLabel={createLabel}
          createIcon={createIcon}
          search={search}
          registerTrigger={registerTrigger}
          registerSearch={registerSearch}
        >
          <ComboboxSyncInput search={search} />
          {children}
        </ComboboxRootProvider>
      </ComboboxPrimitive.Root>
    );
  },
);

ComboboxRoot.displayName = 'Next.Combobox.Root';

/**
 * zag keeps a preselected value when items arrive later but not the input text, so fill it from the selected option;
 * a popup search field is emptied on close instead, so it reopens on every option.
 */
const ComboboxSyncInput = ({ search }: { search: boolean }) => {
  const combobox = useComboboxContext();
  const label: string | undefined = combobox.selectedItems[0]?.label;
  useEffect(() => {
    if (search) {
      if (!combobox.open && combobox.inputValue) {
        combobox.setInputValue('');
      }
    } else if (label && !combobox.open && combobox.inputValue !== label) {
      combobox.setInputValue(label);
    }
  }, [search, label, combobox.open]);
  return null;
};

//
// Label
//

type ComboboxLabelProps = ThemedClassName<ComboboxPrimitive.LabelProps>;

const ComboboxLabel = forwardRef<HTMLLabelElement, ComboboxLabelProps>(({ classNames, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Label {...props} className={mx(recipes.label(), classNames)} ref={forwardedRef} />
));

ComboboxLabel.displayName = 'Next.Combobox.Label';

//
// Control
//

// Inside a Control the Trigger is its caret square; elsewhere it is the button that shows the value.
const ControlContext = createContext(false);

type ComboboxControlProps = ThemedClassName<ComboboxPrimitive.ControlProps> & {
  /**
   * Wraps its children (e.g. the chips of a multiple selection) onto further lines, growing from control height; the
   * trailing caret stays at the end of the last line.
   */
  wrap?: boolean;
};

/** A control-sized row; without children it holds the text `Input` and a trailing caret `Trigger`. */
const ComboboxControl = forwardRef<HTMLDivElement, ComboboxControlProps>(
  ({ classNames, wrap, children, ...props }, forwardedRef) => (
    <ComboboxPrimitive.Control
      {...props}
      data-wrap={wrap ? '' : undefined}
      className={mx(recipes.comboboxControl(), classNames)}
      ref={forwardedRef}
    >
      <ControlContext.Provider value={true}>
        {children ?? (
          <>
            <ComboboxInput />
            <ComboboxTrigger />
          </>
        )}
      </ControlContext.Provider>
    </ComboboxPrimitive.Control>
  ),
);

ComboboxControl.displayName = 'Next.Combobox.Control';

//
// Input
//

// Inside Content the Input is the popup's search field.
const ContentContext = createContext(false);

type ComboboxInputProps = ThemedClassName<ComboboxPrimitive.InputProps>;

/**
 * The text input: in a Control it takes the free space; in `Content` it is the popup's search field, pinned above the
 * options and focused when the popup opens.
 */
const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  ({ classNames, placeholder, ...props }, forwardedRef) => {
    const inContent = useContext(ContentContext);
    const { registerSearch } = useComboboxRootContext('Next.Combobox.Input');
    const { t } = useTranslation(translationKey);
    const localRef = useRef<HTMLInputElement>(null);
    const ref = useComposedRefs(localRef, forwardedRef);
    useLayoutEffect(() => {
      if (inContent) {
        registerSearch(true);
        // zag focuses the input a frame after opening, which can precede the lazily mounted content; the popup is not
        // yet positioned, so scrolling to it would move the page.
        localRef.current?.focus({ preventScroll: true });
        return () => registerSearch(false);
      }
    }, [inContent, registerSearch]);
    const text = placeholder ?? (inContent ? t('combobox.search.label') : undefined);
    return (
      <ComboboxPrimitive.Input
        {...props}
        {...(text === undefined ? {} : { placeholder: text })}
        className={mx(inContent ? recipes.comboboxSearch() : recipes.comboboxInput(), classNames)}
        ref={ref}
      />
    );
  },
);

ComboboxInput.displayName = 'Next.Combobox.Input';

//
// Trigger
//

type ComboboxTriggerProps = ThemedClassName<ComboboxPrimitive.TriggerProps> & {
  /** Shown by the button trigger while nothing is selected. */
  placeholder?: string;
};

/**
 * In a Control, a control-sized square that toggles the listbox (a caret by default). Elsewhere, a control-sized
 * button like `Select.Trigger` that shows the selected option and a caret, and opens a popup whose search field takes
 * focus; closing returns focus to it. With `asChild` the child (e.g. an icon-only `Button` in a toolbar) is the trigger
 * as it is, named and styled by itself.
 */
const ComboboxTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>((props, forwardedRef) =>
  useContext(ControlContext) ? (
    <ComboboxCaretTrigger {...props} ref={forwardedRef} />
  ) : (
    <ComboboxButtonTrigger {...props} ref={forwardedRef} />
  ),
);

ComboboxTrigger.displayName = 'Next.Combobox.Trigger';

const ComboboxCaretTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ classNames, children, placeholder: _placeholder, ...props }, forwardedRef) => (
    <ComboboxPrimitive.Trigger {...props} className={mx(recipes.comboboxTrigger(), classNames)} ref={forwardedRef}>
      {children ?? <Icon icon='ph--caret-up-down--regular' />}
    </ComboboxPrimitive.Trigger>
  ),
);

const ComboboxButtonTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ classNames, children, placeholder, onClick, asChild, ...props }, forwardedRef) => {
    const combobox = useComboboxContext();
    const { loading, registerTrigger } = useComboboxRootContext('Next.Combobox.Trigger');
    useLayoutEffect(() => {
      registerTrigger(true);
      return () => registerTrigger(false);
    }, [registerTrigger]);
    const valueId = useId();
    const selected: ComboboxOption[] = combobox.selectedItems;
    const single = selected.length === 1 ? selected[0] : undefined;
    const text = selected.map((item) => item.label).join(', ');
    return (
      <ComboboxPrimitive.Trigger
        {...props}
        asChild={asChild}
        // A tab stop that zag returns focus to on close.
        focusable
        aria-busy={loading || undefined}
        // Named by the Label and the value, not zag's generic "Toggle suggestions"; a child (`asChild`) names itself.
        aria-labelledby={asChild ? undefined : `${combobox.getLabelProps().id} ${valueId}`}
        onClick={(event) => {
          onClick?.(event);
          // zag closes on a trigger click without restoring focus, and the focused search field unmounts.
          const button = event.currentTarget;
          if (combobox.open) {
            requestAnimationFrame(() => button.focus());
          }
        }}
        className={asChild ? mx(classNames) : mx(recipes.selectTrigger(), classNames)}
        ref={forwardedRef}
      >
        {children ?? (
          <>
            {single?.icon && <Icon icon={single.icon} hue={single.iconHue} />}
            <span id={valueId} data-scope='combobox' data-part='value-text'>
              {text || placeholder}
            </span>
            {loading ? <Icon icon='ph--spinner-gap--regular' spin /> : <Icon icon='ph--caret-up-down--regular' />}
          </>
        )}
      </ComboboxPrimitive.Trigger>
    );
  },
);

//
// ClearTrigger
//

type ComboboxClearTriggerProps = ThemedClassName<ComboboxPrimitive.ClearTriggerProps>;

/** A control-sized square that clears the value, shown only while there is one; an x by default. */
const ComboboxClearTrigger = forwardRef<HTMLButtonElement, ComboboxClearTriggerProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <ComboboxPrimitive.ClearTrigger {...props} className={mx(recipes.comboboxTrigger(), classNames)} ref={forwardedRef}>
      {children ?? <Icon icon='ph--x--regular' />}
    </ComboboxPrimitive.ClearTrigger>
  ),
);

ComboboxClearTrigger.displayName = 'Next.Combobox.ClearTrigger';

//
// Content
//

type ComboboxContentProps = ThemedClassName<ComboboxPrimitive.ContentProps> & {
  /** Overrides the size inherited from the control's nearest sized ancestor (Phase 4 decision 2). */
  size?: Size;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
};

/**
 * Ark's content as a composable part, so the ScrollArea viewport slot merges onto it (a plain Ark part gets the dev
 * warning wrapper, which breaks the frame's child rules); it restates Ark's scope and part, which the slot's replace.
 */
const ComboboxViewport = composable<HTMLDivElement, ComboboxPrimitive.ContentProps>((props, forwardedRef) => (
  <ComboboxPrimitive.Content {...composableProps(props)} data-scope='combobox' data-part='content' ref={forwardedRef} />
));

const COMPOSED_FIELD = 'input, textarea, select, [contenteditable="true"]';

/**
 * zag cancels pointerdown on the popup to keep focus in its search field, which also stops a click focusing a field
 * composed into the Content (e.g. an inline create form), so focus that field explicitly.
 */
const focusComposedField = (event: PointerEvent<HTMLDivElement>) => {
  const field = event.target instanceof Element ? event.target.closest<HTMLElement>(COMPOSED_FIELD) : null;
  if (field && field.dataset.scope !== 'combobox' && event.currentTarget.contains(field)) {
    field.focus();
  }
};

/**
 * Portalled popup at `level='popup'`, scrolling in a thin ScrollArea whose viewport is the popup itself. Without
 * children it lists the options that match the typed text, then the create row, loading row and `Empty`; with a button
 * `Trigger` it first holds the search `Input` and lists them in a `List`. Anchor it to a caret or any other rect with
 * the Root's `positioning.getAnchorRect` (Ark has no virtual-trigger part).
 */
const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ classNames, size, container, children, ...props }, forwardedRef) => {
    const combobox = useComboboxContext();
    const { loading, search } = useComboboxRootContext('Next.Combobox.Content');
    const popupSize = usePopupSize(
      size,
      combobox.open,
      [combobox.getControlProps().id, combobox.getTriggerProps().id],
      'md',
    );
    return (
      <Portal container={container}>
        <ComboboxPrimitive.Positioner>
          <PopupScroll size={popupSize} classNames={mx(classNames)}>
            <ComboboxViewport
              {...props}
              aria-busy={loading || undefined}
              onPointerDown={(event) => {
                props.onPointerDown?.(event);
                focusComposedField(event);
              }}
              ref={forwardedRef}
            >
              <ContentContext.Provider value={true}>
                {children ??
                  (search ? (
                    <>
                      <ComboboxInput />
                      <ComboboxList />
                    </>
                  ) : (
                    <ComboboxOptions />
                  ))}
              </ContentContext.Provider>
            </ComboboxViewport>
          </PopupScroll>
        </ComboboxPrimitive.Positioner>
      </Portal>
    );
  },
);

ComboboxContent.displayName = 'Next.Combobox.Content';

/** The matching options, then the create row, the loading row and the empty state. */
const ComboboxOptions = () => {
  const { collection } = useComboboxContext();
  return (
    <>
      {collection.items
        .filter((item: ComboboxOption) => item.value !== CREATE_VALUE)
        .map((item: ComboboxOption) => (
          <ComboboxItem key={item.value} item={item} />
        ))}
      <ComboboxCreateItem />
      <ComboboxLoading />
      <ComboboxEmpty />
    </>
  );
};

/** A spinner row while results load; presentational, since the popup itself is `aria-busy`. */
const ComboboxLoading = () => {
  const { loading } = useComboboxRootContext('Next.Combobox.Content');
  const { t } = useTranslation(translationKey);
  return loading ? (
    <div role='presentation' data-scope='combobox' data-part='loading' className={recipes.comboboxEmpty()}>
      <Icon icon='ph--spinner-gap--regular' spin />
      {t('combobox.loading.label')}
    </div>
  ) : null;
};

//
// List
//

type ComboboxListProps = ThemedClassName<ComboboxPrimitive.ListProps>;

/**
 * The listbox under a popup search field (the Content is then a dialog); without children, the matching options,
 * create row, loading row and `Empty`.
 */
const ComboboxList = forwardRef<HTMLDivElement, ComboboxListProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <ComboboxPrimitive.List {...props} className={mx(recipes.comboboxList(), classNames)} ref={forwardedRef}>
      {children ?? <ComboboxOptions />}
    </ComboboxPrimitive.List>
  ),
);

ComboboxList.displayName = 'Next.Combobox.List';

//
// Empty
//

type ComboboxEmptyProps = ThemedClassName<ComboboxPrimitive.EmptyProps>;

/** Shown when no option matches and nothing is loading; "No results" by default. */
const ComboboxEmpty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { loading } = useComboboxRootContext('Next.Combobox.Empty');
    const { t } = useTranslation(translationKey);
    return loading ? null : (
      <ComboboxPrimitive.Empty {...props} className={mx(recipes.comboboxEmpty(), classNames)} ref={forwardedRef}>
        {children ?? t('combobox.empty.label')}
      </ComboboxPrimitive.Empty>
    );
  },
);

ComboboxEmpty.displayName = 'Next.Combobox.Empty';

//
// Item
//

// The option an Item renders, so its parts default to the option's icon, label and description.
const ItemContext = createContext<ComboboxOption | undefined>(undefined);

const useItem = (part: string) => {
  const item = useContext(ItemContext);
  if (!item) {
    throw new Error(`Next.Combobox.${part} must be inside Next.Combobox.Item`);
  }
  return item;
};

type ComboboxItemProps = ThemedClassName<Omit<ComboboxPrimitive.ItemProps, 'item' | 'children'>> & {
  item: ComboboxOption;
  /**
   * Replaces the whole row, composed from `ItemIcon`, `ItemText`, `ItemDescription` and `ItemIndicator`; the input
   * still shows the label.
   */
  children?: ReactNode;
};

/**
 * A block-tall row: without children, the option's icon, its label (over its description, when it has one, growing
 * the row by a line) and the check shown while it is selected.
 */
const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ classNames, item, children, ...props }, forwardedRef) => (
    <ItemContext.Provider value={item}>
      <ComboboxPrimitive.Item
        {...props}
        item={item}
        className={mx(recipes.comboboxItem(), classNames)}
        ref={forwardedRef}
      >
        {children ?? (
          <>
            {item.icon && <ComboboxItemIcon />}
            <ComboboxItemText />
            {item.description && <ComboboxItemDescription />}
            <ComboboxItemIndicator />
          </>
        )}
      </ComboboxPrimitive.Item>
    </ItemContext.Provider>
  ),
);

ComboboxItem.displayName = 'Next.Combobox.Item';

//
// CreateItem
//

type ComboboxCreateItemProps = Omit<ComboboxItemProps, 'item'>;

/**
 * The row the Root's `onCreate` offers while the query matches no label exactly: `Create “{query}”` by default. It is
 * an option like any other, last in keyboard order, so place it after the other items when composing a list.
 */
const ComboboxCreateItem = forwardRef<HTMLDivElement, ComboboxCreateItemProps>(
  ({ children, ...props }, forwardedRef) => {
    const { create, createLabel, createIcon } = useComboboxRootContext('Next.Combobox.CreateItem');
    const { t } = useTranslation(translationKey);
    if (!create) {
      return null;
    }

    return (
      <ComboboxItem {...props} item={create} data-create='' ref={forwardedRef}>
        {children ?? (
          <>
            <ComboboxItemIcon icon={createIcon ?? 'ph--plus--regular'} />
            <ComboboxItemText>
              {createLabel?.(create.label) ??
                t('combobox.create.label', { query: create.label, interpolation: { escapeValue: false } })}
            </ComboboxItemText>
          </>
        )}
      </ComboboxItem>
    );
  },
);

ComboboxCreateItem.displayName = 'Next.Combobox.CreateItem';

//
// ItemIcon
//

type ComboboxItemIconProps = Omit<IconProps, 'icon'> & {
  /** Defaults to the option's `icon`. */
  icon?: string;
};

/** The leading icon, in the option's `iconHue` unless given a `hue`. */
const ComboboxItemIcon = forwardRef<SVGSVGElement, ComboboxItemIconProps>(({ icon, hue, ...props }, forwardedRef) => {
  const item = useItem('ItemIcon');
  const glyph = icon ?? item.icon;
  return glyph ? <Icon {...props} icon={glyph} hue={hue ?? item.iconHue} ref={forwardedRef} /> : null;
});

ComboboxItemIcon.displayName = 'Next.Combobox.ItemIcon';

//
// ItemText
//

type ComboboxItemTextProps = ThemedClassName<ComboboxPrimitive.ItemTextProps>;

/** The row's label, taking the free space; the option's `label` by default. */
const ComboboxItemText = forwardRef<HTMLDivElement, ComboboxItemTextProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const item = useItem('ItemText');
    return (
      <ComboboxPrimitive.ItemText {...props} className={mx(classNames)} ref={forwardedRef}>
        {children ?? item.label}
      </ComboboxPrimitive.ItemText>
    );
  },
);

ComboboxItemText.displayName = 'Next.Combobox.ItemText';

//
// ItemDescription
//

type ComboboxItemDescriptionProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

/** A second line under the text in `--color-fg-muted`; the option's `description` by default. */
const ComboboxItemDescription = forwardRef<HTMLDivElement, ComboboxItemDescriptionProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const item = useItem('ItemDescription');
    return (
      <div
        {...props}
        data-scope='combobox'
        data-part='item-description'
        className={mx(recipes.comboboxItemDescription(), classNames)}
        ref={forwardedRef}
      >
        {children ?? item.description}
      </div>
    );
  },
);

ComboboxItemDescription.displayName = 'Next.Combobox.ItemDescription';

//
// ItemIndicator
//

type ComboboxItemIndicatorProps = ThemedClassName<ComboboxPrimitive.ItemIndicatorProps>;

/** Shown while its item is selected: a check by default. */
const ComboboxItemIndicator = forwardRef<HTMLDivElement, ComboboxItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <ComboboxPrimitive.ItemIndicator {...props} className={mx(classNames)} ref={forwardedRef}>
      {children ?? <Icon icon='ph--check--regular' />}
    </ComboboxPrimitive.ItemIndicator>
  ),
);

ComboboxItemIndicator.displayName = 'Next.Combobox.ItemIndicator';

//
// ItemGroup
//

type ComboboxItemGroupProps = ThemedClassName<ComboboxPrimitive.ItemGroupProps>;

/**
 * A `group` of options, named by the `ItemGroupLabel` inside it; order groups as the Root's `items` are ordered, or
 * keyboard order and reading order diverge.
 */
const ComboboxItemGroup = forwardRef<HTMLDivElement, ComboboxItemGroupProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <ComboboxPrimitive.ItemGroup {...props} className={mx(classNames)} ref={forwardedRef} />
  ),
);

ComboboxItemGroup.displayName = 'Next.Combobox.ItemGroup';

//
// ItemGroupLabel
//

type ComboboxItemGroupLabelProps = ThemedClassName<ComboboxPrimitive.ItemGroupLabelProps>;

/** A small caption naming the group, like `Select.ItemGroupLabel`. */
const ComboboxItemGroupLabel = forwardRef<HTMLDivElement, ComboboxItemGroupLabelProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <ComboboxPrimitive.ItemGroupLabel
      {...props}
      className={mx(recipes.popupGroupLabel(), classNames)}
      ref={forwardedRef}
    />
  ),
);

ComboboxItemGroupLabel.displayName = 'Next.Combobox.ItemGroupLabel';

export const Combobox = {
  Root: ComboboxRoot,
  Label: ComboboxLabel,
  Control: ComboboxControl,
  Input: ComboboxInput,
  Trigger: ComboboxTrigger,
  ClearTrigger: ComboboxClearTrigger,
  Content: ComboboxContent,
  List: ComboboxList,
  Empty: ComboboxEmpty,
  Item: ComboboxItem,
  CreateItem: ComboboxCreateItem,
  ItemIcon: ComboboxItemIcon,
  ItemText: ComboboxItemText,
  ItemDescription: ComboboxItemDescription,
  ItemIndicator: ComboboxItemIndicator,
  ItemGroup: ComboboxItemGroup,
  ItemGroupLabel: ComboboxItemGroupLabel,
};

export type {
  ComboboxClearTriggerProps,
  ComboboxContentProps,
  ComboboxControlProps,
  ComboboxCreateItemProps,
  ComboboxEmptyProps,
  ComboboxInputProps,
  ComboboxItemDescriptionProps,
  ComboboxItemGroupLabelProps,
  ComboboxItemGroupProps,
  ComboboxItemIconProps,
  ComboboxItemIndicatorProps,
  ComboboxItemProps,
  ComboboxItemTextProps,
  ComboboxLabelProps,
  ComboboxListProps,
  ComboboxRootProps,
  ComboboxTriggerProps,
};
