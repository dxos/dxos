//
// Copyright 2022 DXOS.org
//

import { CodeInput, getSegmentCssWidth } from 'rci';
import React, { forwardRef, useCallback, ComponentProps, ComponentPropsWithoutRef } from 'react';

import { useButtonShadow, useDensityContext, useForwardedRef, useIsFocused } from '@dxos/aurora';
import { staticInput, mx } from '@dxos/aurora-theme';

import { InputProps } from './InputProps';

const bareInputStyleProps = {
  padding: '8px',
  spacing: '8px',
  fontFamily: ''
};

export type BarePinInputProps = Omit<
  ComponentPropsWithoutRef<typeof CodeInput>,
  'inputRef' | 'renderSegment' | 'spellCheck'
> &
  Pick<InputProps, 'validationMessage' | 'validationValence' | 'variant' | 'elevation' | 'density'>;

// TODO(thure): supplying a `value` prop to CodeInput does not yield correct controlled input interactivity; this may be an issue with RCI (filed as https://github.com/leonardodino/rci/issues/25).
export const BarePinInput = forwardRef<HTMLInputElement, BarePinInputProps>(
  ({ validationMessage, validationValence, variant, elevation, density: propsDensity, ...inputSlot }, ref) => {
    const width = getSegmentCssWidth('13px');
    const inputRef = useForwardedRef(ref);
    const inputFocused = useIsFocused(inputRef);
    const shadow = useButtonShadow(elevation);
    const density = useDensityContext(propsDensity);

    const { disabled } = inputSlot;

    const renderSegment = useCallback<ComponentProps<typeof CodeInput>['renderSegment']>(
      ({ state, index }) => (
        <div
          key={index}
          className={mx(
            staticInput({
              focused: inputFocused && !!state,
              disabled,
              density,
              ...(validationMessage && { validationValence })
            }),
            !disabled && variant !== 'subdued' && shadow
          )}
          data-state={state}
          style={{ width, height: '100%' }}
        />
      ),
      [inputFocused, validationValence, validationMessage, disabled]
    );

    return (
      <CodeInput
        {...{
          spellCheck: false,
          ...bareInputStyleProps,
          ...inputSlot,
          inputRef,
          renderSegment,
          className: mx(
            'font-mono selection:bg-transparent mli-auto',
            disabled && 'cursor-not-allowed',
            inputSlot?.className
          )
        }}
      />
    );
  }
);
