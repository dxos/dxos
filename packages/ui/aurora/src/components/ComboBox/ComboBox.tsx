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

type ValueAdapter<T> = (value: T) => { id: string; text: string };

type ComboBoxContextValue<T> = {
  items: T[];
  adapter: ValueAdapter<T>;
} & UseComboboxReturnValue<T>;

const usePopperScope = createPopperScope();
const [createComboBoxContext] = createContextScope(COMBOBOX_NAME, [createPopperScope]);
const [ComboBoxProvider, useComboBoxContext] = createComboBoxContext<ComboBoxContextValue<any>>(COMBOBOX_NAME);

type ComboBoxRootProps<T> = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      placeholder?: string;
      items?: T[];
      value?: T;
      adapter: ValueAdapter<T>;
      onChange?: (value: T | undefined) => void;
      onInputChange?: (text?: string) => void;
    }>
  >
>;

/**
 * Type-ahead combobox.
 * https://www.downshift-js.com
 */
const ComboBoxRoot = <T,>({
  __scopeComboBox,
  children,
  classNames,
  placeholder,
  items,
  value,
  adapter,
  onChange,
  onInputChange,
}: ComboBoxRootProps<T>) => {
  const { tx } = useThemeContext();
  const popperScope = usePopperScope(__scopeComboBox);

  // https://www.downshift-js.com/use-combobox
  const comboProps = useCombobox<T>({
    items: items ?? [],
    selectedItem: value ?? null,
    itemToString: (selectedItem) => (selectedItem ? adapter(selectedItem).text : ''),
    onInputValueChange: ({ inputValue }) => onInputChange?.(inputValue),
    onSelectedItemChange: ({ selectedItem }) => onChange?.(selectedItem === null ? undefined : selectedItem),
  });

  return (
    <PopperPrimitive.Root {...popperScope}>
      <ComboBoxProvider scope={__scopeComboBox} adapter={adapter} items={items ?? []} {...comboProps}>
        <div className={tx('combobox.root', 'combobox__root', {}, classNames)}>
          <ComboBoxAnchor placeholder={placeholder} />
          <ComboBoxContent />
        </div>
      </ComboBoxProvider>
    </PopperPrimitive.Root>
  );
};

//
// Anchor
//

const ANCHOR_NAME = 'ComboBoxAnchor';

type ComboBoxAnchorProps = ThemedClassName<
  ScopedProps<
    PropsWithChildren<{
      placeholder?: string;
    }>
  >
>;

const ComboBoxAnchor = forwardRef<HTMLDivElement, ComboBoxAnchorProps>(
  ({ __scopeComboBox, classNames, placeholder }: ComboBoxAnchorProps, forwardedRef) => {
    const { tx } = useThemeContext();
    const popperScope = usePopperScope(__scopeComboBox);
    const { getInputProps, getToggleButtonProps, isOpen } = useComboBoxContext(ANCHOR_NAME, __scopeComboBox);

    return (
      <PopperPrimitive.Anchor asChild {...popperScope} ref={forwardedRef}>
        <div className='flex items-center gap-1'>
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
            classNames={tx('combobox.button', 'combobox__button', {}, classNames)}
          >
            {/* TODO(burdon): SelectPrimitive.Icon? */}
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
  ({ __scopeComboBox, classNames }: ComboBoxContentProps, forwardedRef) => {
    const { tx } = useThemeContext();
    const popperScope = usePopperScope(__scopeComboBox);
    const { adapter, items, getMenuProps, getItemProps, highlightedIndex, selectedItem, isOpen } = useComboBoxContext(
      CONTENT_NAME,
      __scopeComboBox,
    );

    return (
      <div>
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
            } as any // TODO(burdon): Why is this needed?
          }
        >
          <ul {...getMenuProps()} className={tx('combobox.content', 'combobox__content', {}, classNames)}>
            {isOpen &&
              items.map((item, index) => (
                <li
                  key={adapter(item).id}
                  data-selected={selectedItem === item ? 'true' : undefined}
                  data-highlighted={highlightedIndex === index ? 'true' : undefined}
                  {...getItemProps({
                    index,
                    item,
                    className: tx('combobox.item', 'combobox__item', {}, classNames),
                  })}
                >
                  {adapter(item).text}
                </li>
              ))}
          </ul>
        </PopperPrimitive.Content>
      </div>
    );
  },
);

// prettier-ignore
export const ComboBox = {
  Root: ComboBoxRoot,
  Anchor: ComboBoxAnchor,
  Content: ComboBoxContent,
};

export type { ComboBoxRootProps, ComboBoxAnchorProps, ComboBoxContentProps };
