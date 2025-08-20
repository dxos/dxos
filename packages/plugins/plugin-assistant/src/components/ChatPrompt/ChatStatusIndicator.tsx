//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type ThemedClassName, useTimeout } from '@dxos/react-ui';
import { Spinner, type SpinnerProps } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

export type ChatStatusIndicatorProps = ThemedClassName<
  {
    preset?: string;
    processing?: boolean;
    error?: Error;
  } & Pick<SpinnerProps, 'size' | 'onClick'>
>;

export const ChatStatusIndicator = ({ classNames, preset, processing, error, ...props }: ChatStatusIndicatorProps) => {
  const [init, setInit] = useState(false);
  useEffect(() => {
    setInit(false);
  }, [preset]);
  useTimeout(
    async () => {
      setInit(true);
    },
    1_500,
    [preset],
  );

  return (
    <div role='none' className={mx('flex', classNames)}>
      <Spinner duration={3_000} state={!init ? 'flash' : error ? 'error' : processing ? 'spin' : 'pulse'} {...props} />
    </div>
  );
};
