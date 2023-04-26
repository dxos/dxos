//
// Copyright 2022 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useDensityContext, useElevationContext, useThemeContext } from '@dxos/aurora';
import { contentElevation } from '@dxos/aurora-theme';

import { TextareaProps } from './InputProps';

export type BareTextareaInputProps = ComponentPropsWithRef<'textarea'> &
  Pick<TextareaProps, 'validationMessage' | 'validationValence' | 'variant' | 'elevation' | 'density'>;

export const BareTextareaInput = forwardRef<HTMLTextAreaElement, BareTextareaInputProps>(
  (
    { validationValence, validationMessage, elevation: propsElevation, density: propsDensity, variant, ...inputSlot },
    forwardedRef
  ) => {
    const { tx } = useThemeContext();
    const isOs = tx('themeName', 'aurora', {}) === 'dxos';
    const { elevation } = useElevationContext();
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
          !inputSlot.disabled && variant !== 'subdued' && contentElevation({ elevation: propsElevation ?? elevation }),
          inputSlot?.className
        )}
      />
    );
  }
);
