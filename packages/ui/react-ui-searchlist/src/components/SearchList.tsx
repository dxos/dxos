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
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type SearchListVariant = 'list' | 'menu' | 'listbox';

type SearchListRootProps = ThemedClassName<ComponentPropsWithRef<typeof CommandRoot>> & {
  variant?: SearchListVariant;
};

const SearchListRoot = forwardRef<HTMLDivElement, SearchListRootProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandRoot {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandRoot>
    );
  },
);

type CommandInputPrimitiveProps = ComponentPropsWithRef<typeof CommandInput>;

// TODO: Harmonize with other inputs’ `onChange` prop.
type SearchListInputProps = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'> &
  Pick<CommandInputPrimitiveProps, 'value' | 'onValueChange' | 'defaultValue'>;

const SearchListInput = forwardRef<HTMLInputElement, SearchListInputProps>(
  (
    { children, classNames, density: propsDensity, elevation: propsElevation, variant = 'subdued', ...props },
    forwardedRef,
  ) => {
    // CHORE(thure): Keep this in-sync with `TextInput`, or submit a PR for `cmdk` to support `asChild` so we don’t have to.
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
          classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  },
);

type SearchListContentProps = ThemedClassName<ComponentPropsWithRef<typeof CommandList>>;

const SearchListContent = forwardRef<HTMLDivElement, SearchListContentProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandList {...props} className={mx('p-1', classNames)} ref={forwardedRef}>
        {children}
      </CommandList>
    );
  },
);

type SearchListEmptyProps = ThemedClassName<ComponentPropsWithRef<typeof CommandEmpty>>;

const SearchListEmpty = forwardRef<HTMLDivElement, SearchListEmptyProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandEmpty {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandEmpty>
    );
  },
);

type SearchListItemProps = ThemedClassName<ComponentPropsWithRef<typeof CommandItem>>;

const SearchListItem = forwardRef<HTMLDivElement, SearchListItemProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandItem
        {...props}
        className={mx('p-1 rounded data-[selected]:bg-neutral-450/10 data-[selected]:hover:bg-25/10', classNames)}
        ref={forwardedRef}
      >
        {children}
      </CommandItem>
    );
  },
);

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
