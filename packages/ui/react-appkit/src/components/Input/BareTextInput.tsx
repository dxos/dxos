//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext, useDensityContext, useElevationContext } from '@dxos/aurora';
import { contentElevation } from '@dxos/aurora-theme';

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
    {
      validationValence,
      validationMessage,
      variant,
      elevation: propsElevation,
      density: propsDensity,
      size,
      ...inputSlot
    },
    forwardedRef
  ) => {
    const { tx } = useThemeContext();
    const isOs = tx('themeName', 'aurora', {}) === 'dxos';
    const { elevation } = useElevationContext();
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
          !inputSlot.disabled && variant !== 'subdued' && contentElevation({ elevation: propsElevation ?? elevation }),
          inputSlot?.className
        )}
      />
    );
  }
);
