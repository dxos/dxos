//
// Copyright 2023 DXOS.org
//
import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, CaretUp, Check } from 'phosphor-react';
import React from 'react';

import { getSize } from '../../styles';
import { mx } from '../../util';
import { Button, ButtonProps } from '../Button';

export type SelectSlots = {
  trigger?: ButtonProps;
};

export type SelectProps = {
  labelId: string;
  slots?: SelectSlots;
};

export const Select = ({ labelId, slots = {} }: SelectProps) => {
  return (
    <SelectPrimitive.Root defaultValue='blueberry'>
      <SelectPrimitive.Trigger asChild aria-labelledby={labelId}>
        <Button {...slots.trigger}>
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon className='mis-2'>
            <CaretDown className={getSize(4)} />
          </SelectPrimitive.Icon>
        </Button>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Content>
        <SelectPrimitive.ScrollUpButton className='flex items-center justify-center text-neutral-700 dark:text-neutral-300'>
          <CaretUp className={getSize(4)} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className='bg-white dark:bg-neutral-800 p-2 rounded-lg shadow-lg'>
          <SelectPrimitive.Group>
            {['Apple', 'Banana', 'Blueberry', 'Strawberry', 'Grapes'].map((f, i) => (
              <SelectPrimitive.Item
                disabled={f === 'Grapes'}
                key={`${f}-${i}`}
                value={f.toLowerCase()}
                className={mx(
                  'relative flex items-center px-8 py-2 rounded-md text-sm text-neutral-700 dark:text-neutral-300 font-medium focus:bg-neutral-100 dark:focus:bg-neutral-900',
                  'radix-disabled:opacity-50',
                  'focus:outline-none select-none'
                )}
              >
                <SelectPrimitive.ItemText>{f}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className='absolute left-2 inline-flex items-center'>
                  <Check className={getSize(4)} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Group>
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className='flex items-center justify-center text-neutral-700 dark:text-neutral-300'>
          <CaretDown className={getSize(4)} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  );
};
