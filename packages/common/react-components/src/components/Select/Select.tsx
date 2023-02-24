//
// Copyright 2023 DXOS.org
//

import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, CaretUp, Check } from 'phosphor-react';
import React from 'react';

import { mx } from '../../util';
import { Button } from '../Button';

export type OptionObject = { id?: string; title: string; disabled?: boolean };
export type Option = string | OptionObject;

export type SelectProps = {
  defaultValue?: string;
  label?: string;
  options?: Option[];
  onChange?: (value: Option) => any;
};

const value = (item: Option) => (typeof item === 'string' ? item : item.id ?? item.title);
const text = (item: Option) => (typeof item === 'string' ? item : item.title ?? item.id);
const disabled = (item: Option) => (typeof item === 'string' ? false : item.disabled);

const eq = (a: Option, b: Option) =>
  a &&
  b &&
  (a === b || (typeof a !== 'string' && typeof b !== 'string')
    ? (a as OptionObject).id === (b as OptionObject).id
    : (a as OptionObject).id === b || (b as OptionObject).id === a);

const defaultOption = (items: Option[], defaultValue?: Option) => {
  if (!items) {
    return undefined;
  }
  if (!defaultValue) {
    return items?.[0];
  }
  return items.find((s) => eq(s, defaultValue)) ?? items[0];
};

export const Select = (props: SelectProps) => {
  const { label, options, onChange } = { options: [], ...props };
  return (
    <SelectPrimitive.Root
      defaultValue={value(defaultOption(options, props.defaultValue) ?? '')}
      onValueChange={(v) => onChange?.(options.find((s) => eq(s, v)) ?? v)}
    >
      <SelectPrimitive.Trigger asChild aria-label={label}>
        <Button>
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon className='ml-2'>
            <CaretDown />
          </SelectPrimitive.Icon>
        </Button>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Content>
        <SelectPrimitive.ScrollUpButton className='flex items-center justify-center text-gray-700 dark:text-gray-300'>
          <div className=''>
            <CaretUp />
          </div>
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className='bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg'>
          <SelectPrimitive.Group>
            {options.map((f, i) => (
              <SelectPrimitive.Item
                disabled={disabled(f)}
                key={`${i}-${value(f)}`}
                value={value(f)}
                className={mx(
                  'relative flex items-center px-8 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 font-medium focus:bg-gray-100 dark:focus:bg-gray-900',
                  'radix-disabled:opacity-50',
                  'focus:outline-none select-none'
                )}
              >
                <SelectPrimitive.ItemText>{text(f)}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className='absolute left-2 inline-flex items-center'>
                  <Check />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Group>
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className='flex items-center justify-center text-gray-700 dark:text-gray-300'>
          <CaretDown />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  );
};
