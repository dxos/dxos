//
// Copyright 2023 DXOS.org
//

import { CodeInput, getSegmentCssWidth } from 'rci';
import React, { ComponentProps, ComponentPropsWithRef, forwardRef, useCallback } from 'react';

import { useForwardedRef, useIsFocused } from '@dxos/react-hooks';

import { INPUT_NAME, InputScopedProps, useInputContext, Valence } from './Root';

type PinInputProps = Omit<ComponentPropsWithRef<typeof CodeInput>, 'id' | 'className'> & {
  asChild?: boolean;
  inputClassName?: string;
  segmentClassName?: (styleProps: { focused: boolean; disabled: boolean; validationValence: Valence }) => string;
  segmentPadding?: string;
  segmentHeight?: string;
};

const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  (
    {
      __inputScope,
      asChild,
      segmentClassName,
      inputClassName,
      segmentPadding = '13px',
      segmentHeight = '100%',
      ...props
    }: InputScopedProps<PinInputProps>,
    forwardedRef
  ) => {
    const { id, validationValence } = useInputContext(INPUT_NAME, __inputScope);
    const width = getSegmentCssWidth(segmentPadding);
    const inputRef = useForwardedRef(forwardedRef);
    const inputFocused = useIsFocused(inputRef);

    const renderSegment = useCallback<ComponentProps<typeof CodeInput>['renderSegment']>(
      ({ state, index }) => (
        <div
          key={index}
          className={segmentClassName?.({
            focused: !!(inputFocused && state),
            disabled: !!props.disabled,
            validationValence
          })}
          data-state={state}
          style={{ width, height: segmentHeight }}
        />
      ),
      [segmentClassName, inputFocused, validationValence, props.disabled]
    );

    return (
      <CodeInput
        {...{
          padding: '8px',
          spacing: '8px',
          fontFamily: '',
          spellCheck: false,
          ...props,
          id,
          inputRef,
          renderSegment,
          className: inputClassName
        }}
      />
    );
  }
);

export { PinInput };

export type { PinInputProps };
