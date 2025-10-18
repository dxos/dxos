//
// Copyright 2023 DXOS.org
//

import { CommandEmpty, CommandInput, CommandItem, CommandList, CommandRoot } from 'cmdk';
import React, { type ComponentPropsWithRef, forwardRef, useCallback } from 'react';

import {
  type TextInputProps,
  type ThemedClassName,
  useDensityContext,
  useElevationContext,
  useThemeContext,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useComboboxContext } from './Combobox';

const SEARCHLIST_NAME = 'SearchList';
const SEARCHLIST_ITEM_NAME = 'SearchListItem';

//
// Root
//

type SearchListVariant = 'list' | 'menu' | 'listbox';

type SearchListRootProps = ThemedClassName<ComponentPropsWithRef<typeof CommandRoot>> & {
  variant?: SearchListVariant;
};

const SearchListRoot = forwardRef<HTMLDivElement, SearchListRootProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandRoot {...props} className={mx(classNames)} ref={forwardedRef}>
        {children}
      </CommandRoot>
    );
  },
);

SearchListRoot.displayName = SEARCHLIST_NAME;

//
// ListInput
//

type CommandInputPrimitiveProps = ComponentPropsWithRef<typeof CommandInput>;

// TODO: Harmonize with other inputs’ `onChange` prop.
type SearchListInputProps = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'> &
  Pick<CommandInputPrimitiveProps, 'value' | 'defaultValue' | 'onValueChange'>;

const SearchListInput = forwardRef<HTMLInputElement, SearchListInputProps>(
  ({ classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    // TODO(thure): Keep this in-sync with `TextInput`, or submit a PR for `cmdk` to support `asChild` so we don’t have to.
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);

    return (
      <CommandInput
        {...props}
        className={tx(
          'input.input',
          'input',
          {
            variant,
            disabled: props.disabled,
            density,
            elevation,
          },
          'mbe-cardSpacingBlock',
          classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  },
);

//
// ListContent
//

type SearchListContentProps = ThemedClassName<ComponentPropsWithRef<typeof CommandList>>;

const SearchListContent = forwardRef<HTMLDivElement, SearchListContentProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandList {...props} className={mx(classNames)} ref={forwardedRef}>
        {children}
      </CommandList>
    );
  },
);

//
// ListEmpty
//

type SearchListEmptyProps = ThemedClassName<ComponentPropsWithRef<typeof CommandEmpty>>;

const SearchListEmpty = forwardRef<HTMLDivElement, SearchListEmptyProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandEmpty {...props} className={mx(classNames)} ref={forwardedRef}>
        {children}
      </CommandEmpty>
    );
  },
);

//
// ListItem
//

type SearchListItemProps = ThemedClassName<ComponentPropsWithRef<typeof CommandItem>>;

// TODO(burdon): Factor out.
const commandItem = 'flex items-center overflow-hidden';
const searchListItem =
  'plb-1 pli-2 rounded-sm select-none cursor-pointer data-[selected]:bg-hoverOverlay hover:bg-hoverOverlay';

const SearchListItem = forwardRef<HTMLDivElement, SearchListItemProps>(
  ({ children, classNames, onSelect, ...props }, forwardedRef) => {
    const { onValueChange, onOpenChange } = useComboboxContext(SEARCHLIST_ITEM_NAME);
    const handleSelect = useCallback(
      (nextValue: string) => {
        onValueChange?.(nextValue);
        onOpenChange?.(false);
        onSelect?.(nextValue);
      },
      [onValueChange, onOpenChange, onSelect],
    );
    return (
      <CommandItem {...props} onSelect={handleSelect} className={mx(searchListItem, classNames)} ref={forwardedRef}>
        {children}
      </CommandItem>
    );
  },
);

SearchListItem.displayName = SEARCHLIST_ITEM_NAME;

//
// SearchList
//

export const SearchList = {
  Root: SearchListRoot,
  Input: SearchListInput,
  Content: SearchListContent,
  Empty: SearchListEmpty,
  Item: SearchListItem,
};

export type {
  SearchListRootProps,
  SearchListInputProps,
  SearchListContentProps,
  SearchListEmptyProps,
  SearchListItemProps,
};

export { commandItem, searchListItem };
