//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { CodeInput, getSegmentCssWidth } from 'rci';
import React, { forwardRef, ForwardedRef, useCallback, ComponentProps } from 'react';

import { useId, useForwardedRef } from '../../hooks';
import { staticInput } from '../../styles/input';

export interface PinInputProps {
  label: string;
  length: number;
}

export const PinInput = forwardRef(({ label, length }: PinInputProps, ref: ForwardedRef<HTMLInputElement>) => {
  const width = getSegmentCssWidth('13px');
  const id = useId('pinInput');
  const inputRef = useForwardedRef(ref);

  const renderSegment = useCallback<ComponentProps<typeof CodeInput>['renderSegment']>(
    ({ state, index }) => (
      <div
        key={index}
        className={staticInput({ focused: !!state })}
        data-state={state}
        style={{ width, height: '100%' }}
      />
    ),
    []
  );

  return (
    <CodeInput
      {...{
        id,
        inputRef,
        length,
        className: cx('font-mono selection:bg-transparent'),
        padding: '8px',
        spacing: '8px',
        spellCheck: false,
        renderSegment,
        fontFamily: ''
      }}
    />
  );
});
