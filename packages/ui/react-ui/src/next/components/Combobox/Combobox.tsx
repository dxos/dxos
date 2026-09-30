//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Combobox as ComboboxPrimitive, useComboboxContext } from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon, type IconProps } from '../Icon/index.ts';
import { PopupScroll, popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';
import { type SelectOption } from '../Select/index.ts';

/** Gap between control and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

export type ComboboxOption = SelectOption;

export type ComboboxFilter = (option: ComboboxOption, query: string) => boolean;

/** Case-insensitive substring match on the label. */
const containsFilter: ComboboxFilter = (option, query) => option.label.toLowerCase().includes(query.toLowerCase());

//
// Root
//

type ComboboxRootProps = ThemedClassName<Omit<ComboboxPrimitive.RootProps<ComboboxOption>, 'collection'>> & {
  items: ComboboxOption[];
  /** Keeps an option while the user types `query`; defaults to a case-insensitive substring match on the label. */
  filter?: ComboboxFilter;
};

/** The option collection narrowed by the typed query; kept outside the component so filtering is testable on its own. */
const useFilteredCollection = (items: ComboboxOption[], filter: (item: ComboboxOption, query: string) => boolean) => {
  const [query, setQuery] = useState('');
  const collection = useMemo(
    () => createListCollection<ComboboxOption>({ items: query ? items.filter((item) => filter(item, query)) : items }),
    [items, filter, query],
  );
  return { collection, setQuery };
};

/** Ark combobox over a flat option list, filtered as the user types; the root takes no box, like Select's. */
const ComboboxRoot = forwardRef<HTMLDivElement, ComboboxRootProps>(
  (
    {
      classNames,
      items,
      filter = containsFilter,
      positioning,
      lazyMount = true,
      unmountOnExit = true,
      inputBehavior = 'autohighlight',
      loopFocus = false,
      onInputValueChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { collection, setQuery } = useFilteredCollection(items, filter);
    return (
      <ComboboxPrimitive.Root
        {...props}
        // Mounting the popup on open keeps it out of a modal Dialog's one-time `aria-hidden` sweep of its siblings.
        lazyMount={lazyMount}
        unmountOnExit={unmountOnExit}
        positioning={popupPositioning(POPUP_GUTTER, positioning)}
        // Typing highlights the first match, so Enter picks it without an arrow key first.
        inputBehavior={inputBehavior}
        // Arrow keys stop at the first and last option rather than wrapping, as in Select and Listbox.
        loopFocus={loopFocus}
        collection={collection}
        onInputValueChange={(details) => {
          // Only typing narrows the list; a selection or clear fills the input but reopening should show every option.
          setQuery(details.reason === 'input-change' ? details.inputValue : '');
          onInputValueChange?.(details);
        }}
        className={mx(recipes.combobox(), classNames)}
        ref={forwardedRef}
      >
        <ComboboxSyncInput />
        {children}
      </ComboboxPrimitive.Root>
    );
  },
);

ComboboxRoot.displayName = 'Next.Combobox.Root';

/** zag keeps a preselected value when items arrive later but not the input text, so fill it from the selected option. */
const ComboboxSyncInput = () => {
  const combobox = useComboboxContext();
  const label: string | undefined = combobox.selectedItems[0]?.label;
  useEffect(() => {
    if (label && !combobox.open && combobox.inputValue !== label) {
      combobox.setInputValue(label);
    }
  }, [label]);
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

type ComboboxControlProps = ThemedClassName<ComboboxPrimitive.ControlProps>;

/** A control-sized row; without children it holds the text `Input` and a trailing caret `Trigger`. */
const ComboboxControl = forwardRef<HTMLDivElement, ComboboxControlProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <ComboboxPrimitive.Control {...props} className={mx(recipes.comboboxControl(), classNames)} ref={forwardedRef}>
      {children ?? (
        <>
          <ComboboxInput />
          <ComboboxTrigger />
        </>
      )}
    </ComboboxPrimitive.Control>
  ),
);

ComboboxControl.displayName = 'Next.Combobox.Control';

//
// Input
//

type ComboboxInputProps = ThemedClassName<ComboboxPrimitive.InputProps>;

/** The text input, taking the Control's free space. */
const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(({ classNames, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Input {...props} className={mx(recipes.comboboxInput(), classNames)} ref={forwardedRef} />
));

ComboboxInput.displayName = 'Next.Combobox.Input';

//
// Trigger
//

type ComboboxTriggerProps = ThemedClassName<ComboboxPrimitive.TriggerProps>;

/** A control-sized square that toggles the listbox; a caret by default. */
const ComboboxTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ classNames, children, ...props }, forwardedRef) => (
    <ComboboxPrimitive.Trigger {...props} className={mx(recipes.comboboxTrigger(), classNames)} ref={forwardedRef}>
      {children ?? <Icon icon='ph--caret-up-down--regular' />}
    </ComboboxPrimitive.Trigger>
  ),
);

ComboboxTrigger.displayName = 'Next.Combobox.Trigger';

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
  /** Shown when no option matches. */
  empty?: ReactNode;
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

/**
 * Portalled listbox at `level='popup'`, scrolling in a thin ScrollArea whose viewport is the listbox itself; without
 * children it lists the options that match the typed text.
 */
const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ classNames, size, empty = 'No results', container, children, ...props }, forwardedRef) => {
    const combobox = useComboboxContext();
    const popupSize = usePopupSize(size, combobox.open, [combobox.getControlProps().id]);
    return (
      <Portal container={container}>
        <ComboboxPrimitive.Positioner>
          <PopupScroll size={popupSize} classNames={mx(classNames)}>
            <ComboboxViewport {...props} ref={forwardedRef}>
              {children ?? <ComboboxItems />}
              <ComboboxPrimitive.Empty className={recipes.comboboxEmpty()}>{empty}</ComboboxPrimitive.Empty>
            </ComboboxViewport>
          </PopupScroll>
        </ComboboxPrimitive.Positioner>
      </Portal>
    );
  },
);

ComboboxContent.displayName = 'Next.Combobox.Content';

/** The filtered options, from the root's collection. */
const ComboboxItems = () => {
  const { collection } = useComboboxContext();
  return (
    <>
      {collection.items.map((item: ComboboxOption) => (
        <ComboboxItem key={item.value} item={item} />
      ))}
    </>
  );
};

//
// Item
//

// The option an Item renders, so its parts default to the option's icon and label.
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
  /** Replaces the whole row, composed from `ItemIcon`, `ItemText` and `ItemIndicator`; the input still shows the label. */
  children?: ReactNode;
};

/** A block-tall row: without children, the option's icon, its label and the check shown while it is selected. */
const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ classNames, item, children, ...props }, forwardedRef) => (
    <ItemContext.Provider value={item}>
      <ComboboxPrimitive.Item
        {...props}
        item={item}
        className={mx(recipes.selectItem(), classNames)}
        ref={forwardedRef}
      >
        {children ?? (
          <>
            {item.icon && <ComboboxItemIcon />}
            <ComboboxItemText />
            <ComboboxItemIndicator />
          </>
        )}
      </ComboboxPrimitive.Item>
    </ItemContext.Provider>
  ),
);

ComboboxItem.displayName = 'Next.Combobox.Item';

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
  Item: ComboboxItem,
  ItemIcon: ComboboxItemIcon,
  ItemText: ComboboxItemText,
  ItemIndicator: ComboboxItemIndicator,
  ItemGroup: ComboboxItemGroup,
  ItemGroupLabel: ComboboxItemGroupLabel,
};

export type {
  ComboboxClearTriggerProps,
  ComboboxContentProps,
  ComboboxControlProps,
  ComboboxInputProps,
  ComboboxItemGroupLabelProps,
  ComboboxItemGroupProps,
  ComboboxItemIconProps,
  ComboboxItemIndicatorProps,
  ComboboxItemProps,
  ComboboxItemTextProps,
  ComboboxLabelProps,
  ComboboxRootProps,
  ComboboxTriggerProps,
};
