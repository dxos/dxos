//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useButtonShadow, useThemeContext, useDensityContext } from '../../hooks';
import { defaultInput, subduedInput } from '../../styles';
import { mx } from '../../util';
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
    const { themeVariant } = useThemeContext();
    const shadow = useButtonShadow(elevation);
    const density = useDensityContext(themeVariant === 'os' ? 'fine' : propsDensity);
    return (
      <input
        {...inputSlot}
        ref={forwardedRef}
        className={mx(
          (variant === 'subdued' ? subduedInput : defaultInput)(
            {
              density,
              disabled: inputSlot.disabled,
              ...(validationMessage && { validationValence })
            },
            themeVariant
          ),
          sizeMap[size ?? 'md'],
          'block is-full',
          !inputSlot.disabled && variant !== 'subdued' && shadow,
          inputSlot?.className
        )}
      />
    );
  }
);
