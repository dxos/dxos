//
// Copyright 2023 DXOS.org
//

import { CommandEmpty, CommandInput, CommandItem, CommandList, CommandRoot } from 'cmdk';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import {
  type TextInputProps,
  type ThemedClassName,
  useDensityContext,
  useElevationContext,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

const commandItem = 'flex items-center overflow-hidden';
const searchListItem =
  'plb-1 pli-2 rounded-sm select-none cursor-pointer data-[selected]:bg-hoverOverlay hover:bg-hoverOverlay';

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
  ({ children, classNames, ...props }, forwardedRef) => (
    <CommandRoot {...props} className={mx(classNames)} ref={forwardedRef}>
      {children}
    </CommandRoot>
  ),
);

SearchListRoot.displayName = SEARCHLIST_NAME;

//
// Input
//

type CommandInputPrimitiveProps = ComponentPropsWithRef<typeof CommandInput>;

// TODO: Harmonize with other inputs’ `onChange` prop.
type SearchListInputProps = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'> &
  Pick<CommandInputPrimitiveProps, 'value' | 'defaultValue' | 'onValueChange'>;

const SearchListInput = forwardRef<HTMLInputElement, SearchListInputProps>(
  ({ classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const placeholder = props.placeholder ?? t('search.placeholder');

    // TODO(thure): Keep this in-sync with `TextInput`, or submit a PR for `cmdk` to support `asChild` so we don’t have to.
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);

    return (
      <CommandInput
        {...props}
        placeholder={placeholder}
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
// Content
//

type SearchListContentProps = ThemedClassName<ComponentPropsWithRef<typeof CommandList>>;

const SearchListContent = forwardRef<HTMLDivElement, SearchListContentProps>(
  ({ children, classNames, ...props }, forwardedRef) => (
    <CommandList {...props} className={mx(classNames)} ref={forwardedRef}>
      {children}
    </CommandList>
  ),
);

//
// Empty
//

type SearchListEmptyProps = ThemedClassName<ComponentPropsWithRef<typeof CommandEmpty>>;

const SearchListEmpty = forwardRef<HTMLDivElement, SearchListEmptyProps>(
  ({ children, classNames, ...props }, forwardedRef) => (
    <CommandEmpty {...props} className={mx(classNames)} ref={forwardedRef}>
      {children}
    </CommandEmpty>
  ),
);

//
// Item
//

type SearchListItemProps = ThemedClassName<ComponentPropsWithRef<typeof CommandItem>>;

const SearchListItem = forwardRef<HTMLDivElement, SearchListItemProps>(
  ({ children, classNames, ...props }, forwardedRef) => (
    <CommandItem {...props} className={mx(searchListItem, classNames)} ref={forwardedRef}>
      {children}
    </CommandItem>
  ),
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
