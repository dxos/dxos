//
// Copyright 2023 DXOS.org
//

import { CodeInput, getSegmentCssWidth } from 'rci';
import React, { type ComponentProps, type ComponentPropsWithRef, type RefObject, forwardRef, useCallback } from 'react';

import { useForwardedRef, useIsFocused } from '@dxos/react-hooks';

import { INPUT_NAME, type InputScopedProps, type Valence, useInputContext } from './Root';

type PinInputProps = Omit<
  ComponentPropsWithRef<typeof CodeInput>,
  'id' | 'className' | 'inputRef' | 'renderSegment'
> & {
  inputClassName?: string;
  segmentClassName?: (styleProps: { focused: boolean; validationValence: Valence }) => string;
  segmentPadding?: string;
  segmentHeight?: string;
};

const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  (
    {
      __inputScope,
      segmentClassName,
      inputClassName,
      segmentPadding = '8px',
      segmentHeight = '100%',
      ...props
    }: InputScopedProps<PinInputProps>,
    forwardedRef,
  ) => {
    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    const width = getSegmentCssWidth(segmentPadding);
    const inputRef = useForwardedRef(forwardedRef);
    const inputFocused = useIsFocused(inputRef);

    const renderSegment = useCallback<ComponentProps<typeof CodeInput>['renderSegment']>(
      ({ state, index }) => (
        <div
          key={index}
          className={segmentClassName?.({
            focused: !!(inputFocused && state),
            validationValence,
          })}
          data-state={state}
          style={{ width, height: segmentHeight }}
        />
      ),
      [segmentClassName, inputFocused, validationValence],
    );

    return (
      <CodeInput
        {...{
          padding: '8px',
          spacing: '8px',
          fontFamily: '',
          spellCheck: false,
          length: 6,
          ...props,
          id,
          'aria-describedby': descriptionId,
          ...(validationValence === 'error' && {
            'aria-invalid': 'true' as const,
            'aria-errormessage': errorMessageId,
          }),
          inputRef: inputRef as RefObject<HTMLInputElement>,
          renderSegment,
          className: inputClassName,
        }}
      />
    );
  },
);

export { PinInput };

export type { PinInputProps };
