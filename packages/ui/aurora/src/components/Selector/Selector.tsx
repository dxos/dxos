//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from '@phosphor-icons/react';
import * as Portal from '@radix-ui/react-portal';
import { useCombobox } from 'downshift';
import React from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { Button } from '../Buttons';
import { Input } from '../Input';

export type SelectorValue = { id: string; text?: string };

type SelectorProps = ThemedClassName<{
  placeholder?: string;
  value?: SelectorValue;
  values?: SelectorValue[];
  matcher?: (value: SelectorValue, text: string) => boolean;
  onChange?: (value: any) => void;
  onInputChange?: (text?: string) => void;
}>;

/**
 * Type-ahead selector.
 * https://www.downshift-js.com
 */
// TODO(burdon): Rename Combobox?
// TODO(burdon): Break into Portal, etc (only way to override classes without slots)?
//   Similarly, provide a simplified "no frills" wrapped form of <Select />, etc.
const Selector = ({ classNames, placeholder, value, values, onChange, onInputChange }: SelectorProps) => {
  const { tx } = useThemeContext();

  // TODO(burdon): Case sensitive by default.
  // https://www.downshift-js.com/use-combobox
  const { isOpen, selectedItem, getInputProps, getToggleButtonProps, getMenuProps, highlightedIndex, getItemProps } =
    useCombobox<SelectorValue>({
      selectedItem: value,
      items: values ?? [],
      itemToString: (item) => (item ? item.text ?? item.id : ''),
      onSelectedItemChange: ({ selectedItem }) => onChange?.(selectedItem),
      onInputValueChange: ({ inputValue }) => onInputChange?.(inputValue),
    });

  // TODO(burdon): Show as DIV unless focused (performance and to see ellipsis values)?
  return (
    <div className={tx('selector.root', 'selector__root', {}, classNames)}>
      {/* TODO(burdon): Should all classes (even purely functional ones) move into theme? */}
      <div className='flex items-center'>
        <Input.Root>
          <Input.TextInput
            {...getInputProps()}
            variant='subdued'
            classNames={tx('selector.input', 'selector__input', {}, classNames)}
            placeholder={placeholder}
          />
        </Input.Root>
        <Button
          {...getToggleButtonProps()}
          variant='ghost'
          classNames={tx('selector.button', 'selector__button', {}, classNames)}
        >
          {/* TODO(burdon): Style icon? */}
          {(isOpen && <CaretUp />) || <CaretDown />}
        </Button>
      </div>

      <Portal.Root>
        xxx
        <ul {...getMenuProps()} className={tx('selector.content', 'selector__content', {}, classNames)}>
          {isOpen
            ? values?.map((value, index) => (
                <li
                  key={value.id}
                  data-selected={selectedItem === value ? 'true' : undefined}
                  data-highlighted={highlightedIndex === index ? 'true' : undefined}
                  {...getItemProps({
                    index,
                    item: value,
                    className: tx('selector.item', 'selector__item', {}, classNames),
                  })}
                >
                  {value.text ?? value.id}
                </li>
              ))
            : null}
        </ul>
      </Portal.Root>
    </div>
  );
};

export { Selector };

export type { SelectorProps };
