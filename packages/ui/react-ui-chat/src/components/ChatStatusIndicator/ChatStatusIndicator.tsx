//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type ThemedClassName, Tooltip, useTimeout } from '@dxos/react-ui';
import { ShapeSpinner, type SpinnerProps } from '@dxos/react-ui-components';
import { mx } from '@dxos/ui-theme';

const ANIMATION_PERIOD = 3_000;

export type ChatStatusIndicatorProps = ThemedClassName<
  {
    // TODO(burdon): Preset (model) triggers reset.
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
    ANIMATION_PERIOD / 2,
    [preset],
  );

  return (
    <div className={mx('relative flex', classNames)}>
      <ShapeSpinner
        duration={ANIMATION_PERIOD}
        state={!init ? 'alert' : error ? 'error' : processing ? 'thinking' : 'ready'}
        {...props}
      />
      {error && (
        <Tooltip.Trigger asChild content={error.message}>
          <div className='dx-fullscreen' />
        </Tooltip.Trigger>
      )}
    </div>
  );
};
