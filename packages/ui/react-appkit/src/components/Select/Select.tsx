//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp, Check } from '@phosphor-icons/react';
import * as SelectPrimitive from '@radix-ui/react-select';
import React, { type ReactNode } from 'react';

import { Button } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export type SelectItemProps = SelectPrimitive.SelectItemProps;

const Item = (props: SelectItemProps) => {
  const { className, children, ...restProps } = { ...props };
  return (
    <SelectPrimitive.Item
      className={mx(
        'relative flex items-center px-8 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 font-medium focus:bg-gray-100 dark:focus:bg-gray-900',
        'radix-disabled:opacity-50',
        'focus:outline-none select-none',
        className,
      )}
      {...restProps}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className='absolute left-2 inline-flex items-center'>
        <Check />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
};

export type SelectProps = {
  className?: string;
  label?: string;
  placeholder?: string;
  children?: ReactNode;
} & Pick<SelectPrimitive.SelectProps, 'defaultValue' | 'value' | 'onValueChange'>;

export const Select = (props: SelectProps) => {
  const { label, className, placeholder, children, ...rest } = { ...props };
  return (
    <SelectPrimitive.Root {...rest}>
      <SelectPrimitive.Trigger className={className} asChild aria-label={label}>
        <Button classNames='whitespace-nowrap'>
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className='ml-2'>
            <CaretDown />
          </SelectPrimitive.Icon>
        </Button>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Content className='z-[50]'>
        <SelectPrimitive.ScrollUpButton className='flex items-center justify-center text-gray-700 dark:text-gray-300'>
          <CaretUp />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className='bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg'>
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className='flex items-center justify-center text-gray-700 dark:text-gray-300'>
          <CaretDown />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  );
};

Select.Group = SelectPrimitive.Group;
Select.Item = Item;
