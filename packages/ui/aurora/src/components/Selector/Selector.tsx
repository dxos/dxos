//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from '@phosphor-icons/react';
import Downshift from 'downshift';
import React from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { Button } from '../Buttons';
import { Input } from '../Input';

export type SelectorValue = { id: string; text?: string };

// TODO(burdon): Callback.
type SelectorProps = ThemedClassName<{
  value?: string;
  values?: SelectorValue[];
  placeholder?: string;
  onChange?: (value: any) => void;
}>;

// TODO(burdon): Case.
const matches = (value: SelectorValue, text: string) => (value.text ?? value.id).includes(text);

/**
 * Typeahead selector.
 * https://www.downshift-js.com
 */
// TODO(burdon): Break into Portal, etc? Similarly, provide a simpler wrapped form of <Select />, etc.
export const Selector = ({ classNames, value, values, onChange, placeholder }: SelectorProps) => {
  const { tx } = useThemeContext();

  return (
    <Downshift<SelectorValue>
      onChange={(selection) => onChange?.(selection)}
      itemToString={(item) => (item ? item.text ?? item.id : '')}
    >
      {({
        getInputProps,
        getItemProps,
        getLabelProps,
        getMenuProps,
        getToggleButtonProps,
        isOpen,
        inputValue,
        highlightedIndex,
        selectedItem,
        getRootProps,
        ...rest
      }) => {
        return (
          <div className='flex flex-col w-full'>
            <div className='flex items-center'>
              <Input.Root>
                <Input.TextInput {...getInputProps()} variant='subdued' classNames='px-2' placeholder={placeholder} />
              </Input.Root>
              <Button {...getToggleButtonProps()} variant='ghost'>
                {(isOpen && <CaretUp />) || <CaretDown />}
              </Button>
            </div>

            {/* TODO(burdon): Max height; radix portal? */}
            <ul {...getMenuProps()} className='relative overflow-y-scroll'>
              {isOpen
                ? values
                    ?.filter((value) => !inputValue || matches(value, inputValue))
                    .map((value, index) => (
                      <li
                        key={value.id}
                        {...getItemProps({
                          index,
                          item: value,
                          className: tx(
                            'selector.content',
                            'selector__content',
                            {
                              highlight: highlightedIndex === index,
                              selected: selectedItem === value,
                            },
                            classNames,
                          ),
                        })}
                      >
                        {value.text ?? value.id}
                      </li>
                    ))
                : null}
            </ul>
          </div>
        );
      }}
    </Downshift>
  );
};

export type { SelectorProps };
