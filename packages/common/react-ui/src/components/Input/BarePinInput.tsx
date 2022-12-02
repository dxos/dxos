//
// Copyright 2022 DXOS.org
//

import { CodeInput, getSegmentCssWidth } from 'rci';
import React, { forwardRef, useCallback, ComponentProps } from 'react';

import { useForwardedRef, useIsFocused } from '../../hooks';
import { staticInput } from '../../styles/input';
import { mx } from '../../util';
import { InputProps, InputSlots } from './InputProps';

const bareInputStyleProps = {
  padding: '8px',
  spacing: '8px',
  fontFamily: ''
};

export type BarePinInputProps = Omit<InputProps, 'ref' | 'label' | 'onChange' | 'slots'> &
  Pick<ComponentProps<typeof CodeInput>, 'onChange' | 'value' | 'length'> & { inputSlot: InputSlots['input'] };

// TODO(thure): supplying a `value` prop to CodeInput does not yield correct controlled input interactivity; this may be an issue with RCI (filed as https://github.com/leonardodino/rci/issues/25).
export const BarePinInput = forwardRef<HTMLInputElement, BarePinInputProps>(
  ({ initialValue, size, validationMessage, validationValence, value, disabled, inputSlot }, ref) => {
    const width = getSegmentCssWidth('13px');
    const inputRef = useForwardedRef(ref);
    const inputFocused = useIsFocused(inputRef);

    const renderSegment = useCallback<ComponentProps<typeof CodeInput>['renderSegment']>(
      ({ state, index }) => (
        <div
          key={index}
          className={staticInput({
            focused: inputFocused && !!state,
            disabled,
            ...(validationMessage && { validationValence })
          })}
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
          ...inputSlot,
          ...bareInputStyleProps,
          inputRef,
          className: mx(
            'font-mono selection:bg-transparent mli-auto',
            disabled && 'cursor-not-allowed',
            inputSlot?.className
          ),
          renderSegment
        }}
      />
    );
  }
);
