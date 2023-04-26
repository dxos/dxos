//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useButtonShadow, useDensityContext, useThemeContext } from '@dxos/aurora';

import { TextareaProps } from './InputProps';

export type BareTextareaInputProps = ComponentPropsWithRef<'textarea'> &
  Pick<TextareaProps, 'validationMessage' | 'validationValence' | 'variant' | 'elevation' | 'density'>;

export const BareTextareaInput = forwardRef<HTMLTextAreaElement, BareTextareaInputProps>(
  ({ validationValence, validationMessage, elevation, density: propsDensity, variant, ...inputSlot }, forwardedRef) => {
    const { tx } = useThemeContext();
    const isOs = tx('themeName', 'aurora', {}) === 'dxos';
    const shadow = useButtonShadow(elevation);
    const density = useDensityContext(isOs ? 'fine' : propsDensity);
    return (
      <textarea
        ref={forwardedRef}
        {...inputSlot}
        className={tx(
          'input.input',
          'input__textarea',
          { variant, density, disabled: inputSlot.disabled, validationValence },
          'block is-full',
          !inputSlot.disabled && variant !== 'subdued' && shadow,
          inputSlot?.className
        )}
      />
    );
  }
);
