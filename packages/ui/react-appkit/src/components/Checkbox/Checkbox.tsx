//
// Copyright 2023 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import React, { ComponentPropsWithoutRef } from 'react';

import { useThemeContext } from '@dxos/aurora';
import { getSize, mx, defaultFocus, osFocus } from '@dxos/aurora-theme';

type SharedCheckboxProps = Pick<
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
  'defaultChecked' | 'checked' | 'onCheckedChange' | 'className'
>;

export type CheckboxProps = SharedCheckboxProps & ({ labelId: string } | { id: string });

export const Checkbox = (props: CheckboxProps) => {
  const { tx } = useThemeContext();
  const isOs = tx('themeName', 'aurora', {}) === 'dxos';
  const { defaultChecked, checked, onCheckedChange, className } = props;
  return (
    <CheckboxPrimitive.Root
      {...('id' in props && { id: props.id })}
      {...('labelId' in props && { 'aria-labelledby': props.labelId })}
      {...{ defaultChecked, checked, onCheckedChange }}
      className={mx(
        getSize(5),
        'flex items-center justify-center rounded text-white',
        'radix-state-checked:bg-primary-600 radix-state-unchecked:bg-neutral-200 dark:radix-state-unchecked:bg-neutral-700',
        isOs ? osFocus : defaultFocus,
        className
      )}
    >
      <CheckboxPrimitive.Indicator>
        <Check weight='bold' className={getSize(4)} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
};
