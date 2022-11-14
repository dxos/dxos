//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { CodeInput, getSegmentCssWidth } from 'rci';
import React, { forwardRef, useCallback, ComponentProps } from 'react';

import { useForwardedRef, useIsFocused } from '../../hooks';
import { staticInput } from '../../styles/input';
import { InputProps } from './InputProps';

const bareInputStyleProps = {
  padding: '8px',
  spacing: '8px',
  fontFamily: ''
};

export type BarePinInputProps = Omit<InputProps, 'ref' | 'label' | 'onChange'> &
  Pick<ComponentProps<typeof CodeInput>, 'onChange' | 'value' | 'length'>;

// TODO(thure): supplying a `value` prop to CodeInput does not yield correct controlled input interactivity; this may be an issue with RCI (filed as https://github.com/leonardodino/rci/issues/25).
export const BarePinInput = forwardRef<HTMLInputElement, BarePinInputProps>(
  ({ initialValue, size, validationMessage, validationValence, value, ...inputProps }, ref) => {
    const width = getSegmentCssWidth('13px');
    const inputRef = useForwardedRef(ref);
    const inputFocused = useIsFocused(inputRef);

    const renderSegment = useCallback<ComponentProps<typeof CodeInput>['renderSegment']>(
      ({ state, index }) => (
        <div
          key={index}
          className={staticInput({
            focused: inputFocused && !!state,
            disabled: inputProps.disabled,
            ...(validationMessage && { validationValence })
          })}
          data-state={state}
          style={{ width, height: '100%' }}
        />
      ),
      [inputFocused, validationValence, validationMessage, inputProps.disabled]
    );

    return (
      <CodeInput
        {...{
          spellCheck: false,
          ...inputProps,
          ...bareInputStyleProps,
          inputRef,
          className: cx(
            'font-mono selection:bg-transparent mli-auto',
            inputProps.disabled && 'cursor-not-allowed',
            inputProps.className
          ),
          renderSegment
        }}
      />
    );
  }
);
