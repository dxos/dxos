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

type KomboboxRootProps = ThemedClassName<ComponentPropsWithRef<typeof CommandRoot>>;

const KomboboxRoot = forwardRef<HTMLDivElement, KomboboxRootProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandRoot {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandRoot>
    );
  },
);

type CommandInputPrimitiveProps = ComponentPropsWithRef<typeof CommandInput>;

type KomboboxInputProps = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'> &
  Pick<CommandInputPrimitiveProps, 'value' | 'defaultValue'> & {
    onChange: CommandInputPrimitiveProps['onValueChange'];
  };

const KomboboxInput = forwardRef<HTMLInputElement, KomboboxInputProps>(
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

type KomboboxListProps = ThemedClassName<ComponentPropsWithRef<typeof CommandList>>;

const KomboboxList = forwardRef<HTMLDivElement, KomboboxListProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandList {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandList>
    );
  },
);

type KomboboxEmptyProps = ThemedClassName<ComponentPropsWithRef<typeof CommandEmpty>>;

const KomboboxEmpty = forwardRef<HTMLDivElement, KomboboxEmptyProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandEmpty {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandEmpty>
    );
  },
);

type KomboboxItemProps = ThemedClassName<ComponentPropsWithRef<typeof CommandItem>>;

const KomboboxItem = forwardRef<HTMLDivElement, KomboboxItemProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandItem {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandItem>
    );
  },
);

export const Kombobox = {
  Root: KomboboxRoot,
  Input: KomboboxInput,
  List: KomboboxList,
  Empty: KomboboxEmpty,
  Item: KomboboxItem,
};

export type { KomboboxRootProps, KomboboxInputProps, KomboboxListProps, KomboboxEmptyProps, KomboboxItemProps };
