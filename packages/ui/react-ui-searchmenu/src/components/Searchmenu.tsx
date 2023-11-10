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

type SearchmenuRootProps = ThemedClassName<ComponentPropsWithRef<typeof CommandRoot>>;

const SearchmenuRoot = forwardRef<HTMLDivElement, SearchmenuRootProps>(
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
type SearchmenuInputProps = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'> &
  Pick<CommandInputPrimitiveProps, 'value' | 'onValueChange' | 'defaultValue'>;

const SearchmenuInput = forwardRef<HTMLInputElement, SearchmenuInputProps>(
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

type SearchmenuListProps = ThemedClassName<ComponentPropsWithRef<typeof CommandList>>;

const SearchmenuList = forwardRef<HTMLDivElement, SearchmenuListProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandList {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandList>
    );
  },
);

type SearchmenuEmptyProps = ThemedClassName<ComponentPropsWithRef<typeof CommandEmpty>>;

const SearchmenuEmpty = forwardRef<HTMLDivElement, SearchmenuEmptyProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandEmpty {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandEmpty>
    );
  },
);

type SearchmenuItemProps = ThemedClassName<ComponentPropsWithRef<typeof CommandItem>>;

const SearchmenuItem = forwardRef<HTMLDivElement, SearchmenuItemProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandItem {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandItem>
    );
  },
);

export const Searchmenu = {
  Root: SearchmenuRoot,
  Input: SearchmenuInput,
  List: SearchmenuList,
  Empty: SearchmenuEmpty,
  Item: SearchmenuItem,
};

export type {
  SearchmenuRootProps,
  SearchmenuInputProps,
  SearchmenuListProps,
  SearchmenuEmptyProps,
  SearchmenuItemProps,
};
