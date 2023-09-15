//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { createPopperScope } from '@radix-ui/react-popper';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { useCombobox, UseComboboxReturnValue } from 'downshift';
import React, { forwardRef, PropsWithChildren } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { Button } from '../Buttons';
import { Input } from '../Input';

const COMBOBOX_NAME = 'ComboBox';

type ScopedProps<P> = P & { __scopeComboBox?: Scope };

type ComboBoxItem = {
  id: string;
  label: string;
  data?: any;
};

type ComboBoxContextValue = {
  items: ComboBoxItem[];
} & UseComboboxReturnValue<ComboBoxItem>;

const usePopperScope = createPopperScope();
const [createComboBoxContext] = createContextScope(COMBOBOX_NAME, [createPopperScope]);
const [ComboBoxProvider, useComboBoxContext] = createComboBoxContext<ComboBoxContextValue>(COMBOBOX_NAME);

type ComboBoxRootProps = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      items?: ComboBoxItem[];
      value?: ComboBoxItem;
      onChange?: (selected: ComboBoxItem | undefined) => void;
      onInputChange?: (text?: string) => void;
    }>
  >
>;

/**
 * Type-ahead combobox.
 */
const ComboBoxRoot = ({
  __scopeComboBox,
  children,
  classNames,
  items = [],
  value,
  onChange,
  onInputChange,
}: ComboBoxRootProps) => {
  const { tx } = useThemeContext();
  const popperScope = usePopperScope(__scopeComboBox);

  // TODO(burdon): Remove and implement natively?
  // https://www.downshift-js.com/use-combobox
  const comboProps = useCombobox<ComboBoxItem>({
    items,
    itemToString: (selectedItem) => selectedItem?.label ?? '',
    onInputValueChange: ({ inputValue }) => onInputChange?.(inputValue),
    selectedItem: value,
    onSelectedItemChange: ({ selectedItem }) => onChange?.(selectedItem === null ? undefined : selectedItem),
  });

  return (
    <ComboBoxProvider scope={__scopeComboBox} items={items} {...comboProps}>
      <PopperPrimitive.Root {...popperScope}>
        <div className={tx('combobox.root', 'combobox__root', {}, classNames)}>{children}</div>
      </PopperPrimitive.Root>
    </ComboBoxProvider>
  );
};

//
// Input
//

const INPUT_NAME = 'ComboBoxInput';

type ComboBoxInputProps = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      placeholder?: string;
    }>
  >
>;

const ComboBoxInput = forwardRef<HTMLDivElement, ComboBoxInputProps>(
  ({ __scopeComboBox, classNames, placeholder }: ComboBoxInputProps, forwardedRef) => {
    const { tx } = useThemeContext();
    const popperScope = usePopperScope(__scopeComboBox);
    const { getInputProps, getToggleButtonProps, isOpen } = useComboBoxContext(INPUT_NAME, __scopeComboBox);

    // TODO(burdon): Break out input and button.
    return (
      <PopperPrimitive.Anchor asChild {...popperScope} ref={forwardedRef}>
        {/* TODO(burdon): Move class to theme. */}
        <div role='none' className='flex items-center gap-1'>
          <Input.Root>
            <Input.TextInput
              {...getInputProps()}
              placeholder={placeholder}
              variant='subdued'
              classNames={tx('combobox.input', 'combobox__input', {}, classNames)}
            />
          </Input.Root>
          <Button
            {...getToggleButtonProps()}
            aria-label='toggle menu'
            variant='ghost'
            classNames={tx('combobox.button', 'combobox__button')}
          >
            {(isOpen && <CaretUp />) || <CaretDown />}
          </Button>
        </div>
      </PopperPrimitive.Anchor>
    );
  },
);

//
// Content
//

const CONTENT_NAME = 'ComboBoxContent';

type ComboBoxContentProps = ThemedClassName<ScopedProps<PropsWithChildren<{}>>>;

const ComboBoxContent = forwardRef<HTMLDivElement, ComboBoxContentProps>(
  ({ __scopeComboBox, classNames, children }: ComboBoxContentProps, forwardedRef) => {
    const { tx } = useThemeContext();
    const popperScope = usePopperScope(__scopeComboBox);
    const { getMenuProps, isOpen } = useComboBoxContext(CONTENT_NAME, __scopeComboBox);

    return (
      <PopperPrimitive.Content
        data-state={isOpen}
        role='dialog'
        {...popperScope}
        ref={forwardedRef}
        style={
          {
            // Re-namespace exposed content custom properties.
            ...{
              '--radix-combobox-content-transform-origin': 'var(--radix-popper-transform-origin)',
              '--radix-combobox-content-available-width': 'var(--radix-popper-available-width)',
              '--radix-combobox-content-available-height': 'var(--radix-popper-available-height)',
              '--radix-combobox-trigger-width': 'var(--radix-popper-anchor-width)',
              '--radix-combobox-trigger-height': 'var(--radix-popper-anchor-height)',
            },
          } as any // TODO(burdon): Why any?
        }
      >
        <ul {...getMenuProps()} className={tx('combobox.content', 'combobox__content', {}, classNames)}>
          {isOpen && children}
        </ul>
      </PopperPrimitive.Content>
    );
  },
);

//
// Item
//

const ITEM_NAME = 'ComboBoxItem';

type ComboBoxItemProps = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      item: ComboBoxItem;
    }>
  >
>;

const ComboBoxItem = forwardRef<HTMLLIElement, ComboBoxItemProps>(
  ({ __scopeComboBox, classNames, children, item }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { getItemProps, items, selectedItem, highlightedIndex } = useComboBoxContext(ITEM_NAME, __scopeComboBox);

    return (
      <li
        ref={forwardedRef}
        data-selected={selectedItem?.id === item.id ? 'true' : undefined}
        data-highlighted={
          highlightedIndex !== undefined && items[highlightedIndex]?.id === item.id ? 'true' : undefined
        }
        className={tx('combobox.item', 'item', {}, classNames)}
        {...getItemProps({ item })}
      >
        {children}
      </li>
    );
  },
);

// prettier-ignore
export const ComboBox = {
  Root: ComboBoxRoot,
  Input: ComboBoxInput,
  Content: ComboBoxContent,
  Item: ComboBoxItem
};

// prettier-ignore
export type {
  ComboBoxItem,
  ComboBoxRootProps,
  ComboBoxInputProps,
  ComboBoxContentProps,
  ComboBoxItemProps
};
