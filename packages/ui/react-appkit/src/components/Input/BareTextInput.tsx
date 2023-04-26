//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useButtonShadow, useThemeContext, useDensityContext } from '@dxos/aurora';

import { InputProps, InputSize } from './InputProps';

const sizeMap: Record<InputSize, string> = {
  md: 'text-base',
  lg: 'text-lg',
  pin: '',
  textarea: ''
};

export type BareTextInputProps = Omit<ComponentPropsWithRef<'input'>, 'size'> &
  Pick<InputProps, 'validationMessage' | 'validationValence' | 'size' | 'variant' | 'elevation' | 'density'>;

export const BareTextInput = forwardRef<HTMLInputElement, BareTextInputProps>(
  (
    { validationValence, validationMessage, variant, elevation, density: propsDensity, size, ...inputSlot },
    forwardedRef
  ) => {
    const { tx } = useThemeContext();
    const isOs = tx('themeName', 'aurora', {}) === 'dxos';
    const shadow = useButtonShadow(elevation);
    const density = useDensityContext(isOs ? 'fine' : propsDensity);
    return (
      <input
        {...inputSlot}
        ref={forwardedRef}
        className={tx(
          'input.input',
          'input__textarea',
          { variant, density, disabled: inputSlot.disabled, validationValence },
          sizeMap[size ?? 'md'],
          'block is-full',
          !inputSlot.disabled && variant !== 'subdued' && shadow,
          inputSlot?.className
        )}
      />
    );
  }
);
