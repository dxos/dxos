//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { CommandEmpty, CommandInput, CommandItem, CommandList, CommandRoot } from 'cmdk';
import React, { type ComponentPropsWithRef, type PropsWithChildren, forwardRef, useCallback } from 'react';

import {
  Button,
  type ButtonProps,
  Icon,
  type TextInputProps,
  type ThemedClassName,
  useDensityContext,
  useElevationContext,
  useId,
  useThemeContext,
} from '@dxos/react-ui';
import { mx, staticPlaceholderText } from '@dxos/react-ui-theme';

type SearchListVariant = 'list' | 'menu' | 'listbox';

type SearchListRootProps = ThemedClassName<ComponentPropsWithRef<typeof CommandRoot>> & {
  variant?: SearchListVariant;
};

type ComboboxContextValue = {
  modalId: string;
  isCombobox: true;
  placeholder?: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  value: string;
  onValueChange: (nextValue: string) => void;
};

const COMBOBOX_NAME = 'Combobox';
const COMBOBOX_TRIGGER_NAME = 'ComboboxTrigger';
const SEARCHLIST_NAME = 'SearchList';
const SEARCHLIST_ITEM_NAME = 'SearchListItem';

const [ComboboxProvider, useComboboxContext] = createContext<Partial<ComboboxContextValue>>(COMBOBOX_NAME, {});

type ComboboxRootProps = PropsWithChildren<
  Partial<ComboboxContextValue & { defaultOpen: boolean; defaultValue: string; placeholder: string }>
>;

const SearchListRoot = forwardRef<HTMLDivElement, SearchListRootProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <CommandRoot {...props} className={mx('', classNames)} ref={forwardedRef}>
        {children}
      </CommandRoot>
    );
  },
);

SearchListRoot.displayName = SEARCHLIST_NAME;

type CommandInputPrimitiveProps = ComponentPropsWithRef<typeof CommandInput>;

// TODO: Harmonize with other inputs’ `onChange` prop.
type SearchListInputProps = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange'> &
  Pick<CommandInputPrimitiveProps, 'value' | 'defaultValue' | 'onValueChange'>;

const SearchListInput = forwardRef<HTMLInputElement, SearchListInputProps>(
  ({ classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
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
          'mbe-cardSpacingBlock',
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
      <CommandList {...props} className={mx(classNames)} ref={forwardedRef}>
        {children}
      </CommandList>
    );
  },
);

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

type SearchListItemProps = ThemedClassName<ComponentPropsWithRef<typeof CommandItem>>;

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

const ComboboxRoot = ({
  modalId: propsModalId,
  open: propsOpen,
  defaultOpen,
  onOpenChange: propsOnOpenChange,
  value: propsValue,
  defaultValue,
  onValueChange: propsOnValueChange,
  placeholder,
  children,
}: ComboboxRootProps) => {
  const modalId = useId(COMBOBOX_NAME, propsModalId);
  const [open = false, onOpenChange] = useControllableState({
    prop: propsOpen,
    onChange: propsOnOpenChange,
    defaultProp: defaultOpen,
  });
  const [value = '', onValueChange] = useControllableState({
    prop: propsValue,
    onChange: propsOnValueChange,
    defaultProp: defaultValue,
  });
  return (
    <ComboboxProvider
      isCombobox
      modalId={modalId}
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
    >
      {children}
    </ComboboxProvider>
  );
};

ComboboxRoot.displayName = COMBOBOX_NAME;

type ComboboxTriggerProps = ButtonProps;

const ComboboxTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ children, onClick, ...props }, forwardedRef) => {
    const { modalId, open, onOpenChange, placeholder, value } = useComboboxContext(COMBOBOX_TRIGGER_NAME);
    const handleClick = useCallback(
      (event: Parameters<Exclude<ButtonProps['onClick'], undefined>>[0]) => {
        onClick?.(event);
        onOpenChange?.(true);
      },
      [onClick, onOpenChange],
    );
    return (
      <Button
        {...props}
        role='combobox'
        aria-expanded={open}
        aria-controls={modalId}
        aria-haspopup='dialog'
        onClick={handleClick}
        ref={forwardedRef}
      >
        {children ?? (
          <>
            <span
              className={mx('font-normal text-start flex-1 min-is-0 truncate mie-2', !value && staticPlaceholderText)}
            >
              {value || placeholder}
            </span>
            <Icon icon='ph--caret-down--bold' size={3} />
          </>
        )}
      </Button>
    );
  },
);

ComboboxTrigger.displayName = COMBOBOX_TRIGGER_NAME;

export const SearchList = {
  Root: SearchListRoot,
  Input: SearchListInput,
  Content: SearchListContent,
  Empty: SearchListEmpty,
  Item: SearchListItem,
};

export const Combobox = {
  Root: ComboboxRoot,
  Trigger: ComboboxTrigger,
  useComboboxContext,
};

export type {
  SearchListRootProps,
  SearchListInputProps,
  SearchListContentProps,
  SearchListEmptyProps,
  SearchListItemProps,
  ComboboxRootProps,
  ComboboxTriggerProps,
};

export { commandItem, searchListItem };
