//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type ThemedClassName, Tooltip, useTimeout } from '@dxos/react-ui';
import { Spinner, type SpinnerProps } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/ui-theme';

const period = 3_000;

export type ChatStatusIndicatorProps = ThemedClassName<
  {
    preset?: string;
    processing?: boolean;
    error?: Error;
  } & Pick<SpinnerProps, 'size' | 'onClick'>
>;

export const ChatStatusIndicator = ({ classNames, preset, processing, error, ...props }: ChatStatusIndicatorProps) => {
  const [init, setInit] = useState(false);
  useEffect(() => setInit(false), [preset]);
  useTimeout(
    async () => {
      setInit(true);
    },
    period / 2,
    [preset],
  );

  return (
    <div role='none' className={mx('relative flex', classNames)}>
      <Spinner duration={period} state={!init ? 'flash' : error ? 'error' : processing ? 'spin' : 'pulse'} {...props} />
      {error && (
        <Tooltip.Trigger asChild content={error.message}>
          <div className='absolute inset-0' />
        </Tooltip.Trigger>
      )}
    </div>
  );
};
