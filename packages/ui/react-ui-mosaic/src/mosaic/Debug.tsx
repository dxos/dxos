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
      'font-mono text-xs overflow-hidden m-2 p-1 z-[100]',
      'bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 rounded',
      position === 'bottom-left' && 'fixed left-0 bottom-0',
      position === 'bottom-right' && 'fixed right-0 bottom-0',
    )}
  >
    {JSON.stringify(data, undefined, 1)}
  </pre>
);
