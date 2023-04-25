//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useButtonShadow, useDensityContext, useThemeContext } from '@dxos/aurora';
import { defaultInput, subduedInput, mx } from '@dxos/aurora-theme';

import { TextareaProps } from './InputProps';

export type BareTextareaInputProps = ComponentPropsWithRef<'textarea'> &
  Pick<TextareaProps, 'validationMessage' | 'validationValence' | 'variant' | 'elevation' | 'density'>;

export const BareTextareaInput = forwardRef<HTMLTextAreaElement, BareTextareaInputProps>(
  ({ validationValence, validationMessage, elevation, density: propsDensity, variant, ...inputSlot }, forwardedRef) => {
    const { themeVariant } = useThemeContext();
    const shadow = useButtonShadow(elevation);
    const density = useDensityContext(themeVariant === 'os' ? 'fine' : propsDensity);
    return (
      <textarea
        ref={forwardedRef}
        {...inputSlot}
        className={mx(
          (variant === 'subdued' ? subduedInput : defaultInput)({
            density,
            disabled: inputSlot.disabled,
            ...(validationMessage && { validationValence })
          }),
          'block is-full',
          !inputSlot.disabled && variant !== 'subdued' && shadow,
          inputSlot?.className
        )}
      />
    );
  }
);
