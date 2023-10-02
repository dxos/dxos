//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

type Position = 'bottom-left' | 'bottom-right';

export const Debug: FC<{ data: any; position?: Position }> = ({ data, position }) => (
  <pre
    className={mx(
      'font-mono text-xs overflow-hidden m-2 p-1 bg-neutral-50 border border-neutral-300 z-[100]',
      position === 'bottom-left' && 'absolute left-0 bottom-0',
      position === 'bottom-right' && 'absolute right-0 bottom-0',
    )}
  >
    {JSON.stringify(data, undefined, 1)}
  </pre>
);
