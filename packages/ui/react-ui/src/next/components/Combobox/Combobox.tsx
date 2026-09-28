//
// Copyright 2026 DXOS.org
//

import { createListCollection } from '@ark-ui/react/collection';
import { Combobox as ComboboxPrimitive, useComboboxContext } from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';
import React, { type ReactNode, type RefObject, forwardRef, useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Icon } from '../Icon/index.ts';
import { PopupScroll, popupPositioning } from '../ScrollArea/PopupScroll.tsx';
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
// Input
//

type ComboboxInputProps = ThemedClassName<ComboboxPrimitive.InputProps> & {
  'data-testid'?: string;
};

/** A control-sized row holding the text input and a trailing caret trigger that toggles the listbox. */
const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(
  ({ classNames, 'data-testid': testId, ...props }, forwardedRef) => (
    <ComboboxPrimitive.Control data-testid={testId} className={mx(recipes.comboboxControl(), classNames)}>
      <ComboboxPrimitive.Input {...props} className={recipes.comboboxInput()} ref={forwardedRef} />
      <ComboboxPrimitive.Trigger className={recipes.comboboxTrigger()}>
        <Icon icon='ph--caret-up-down--regular' />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.Control>
  ),
);

ComboboxInput.displayName = 'Next.Combobox.Input';

//
// Content
//

type ComboboxContentProps = ThemedClassName<ComboboxPrimitive.ContentProps> & {
  /** Portalled content leaves the control's sized scope, so it takes its own size. */
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
  ({ classNames, size, empty = 'No results', container, children, ...props }, forwardedRef) => (
    <Portal container={container}>
      <ComboboxPrimitive.Positioner>
        <PopupScroll size={size} classNames={mx(classNames)}>
          <ComboboxViewport {...props} ref={forwardedRef}>
            {children ?? <ComboboxItems />}
            <ComboboxPrimitive.Empty className={recipes.comboboxEmpty()}>{empty}</ComboboxPrimitive.Empty>
          </ComboboxViewport>
        </PopupScroll>
      </ComboboxPrimitive.Positioner>
    </Portal>
  ),
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

type ComboboxItemProps = ThemedClassName<Omit<ComboboxPrimitive.ItemProps, 'item' | 'children'>> & {
  item: ComboboxOption;
};

const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(({ classNames, item, ...props }, forwardedRef) => (
  <ComboboxPrimitive.Item {...props} item={item} className={mx(recipes.selectItem(), classNames)} ref={forwardedRef}>
    {item.icon && <Icon icon={item.icon} />}
    <ComboboxPrimitive.ItemText>{item.label}</ComboboxPrimitive.ItemText>
    <ComboboxPrimitive.ItemIndicator>
      <Icon icon='ph--check--regular' />
    </ComboboxPrimitive.ItemIndicator>
  </ComboboxPrimitive.Item>
));

ComboboxItem.displayName = 'Next.Combobox.Item';

export const Combobox = {
  Root: ComboboxRoot,
  Label: ComboboxLabel,
  Input: ComboboxInput,
  Content: ComboboxContent,
  Item: ComboboxItem,
};

export type { ComboboxContentProps, ComboboxInputProps, ComboboxItemProps, ComboboxLabelProps, ComboboxRootProps };
