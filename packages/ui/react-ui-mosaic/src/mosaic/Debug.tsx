//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

type Position = 'bottom-left' | 'bottom-right';

export type DebugProps = { data: any; position?: Position };

export const Debug: FC<DebugProps> = ({ data, position }) => (
  <pre
    className={mx(
      'z-[100] m-2 overflow-hidden p-1 font-mono text-xs',
      'rounded border border-neutral-300 bg-neutral-50 dark:bg-neutral-700',
      position === 'bottom-left' && 'fixed bottom-0 left-0',
      position === 'bottom-right' && 'fixed bottom-0 right-0',
    )}
  >
    {JSON.stringify(data, undefined, 1)}
  </pre>
);
