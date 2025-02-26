//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

/**
 * Container centers child while preserving the aspect ratio.
 */
export const ResponsiveContainer = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div className={mx('relative flex w-full h-full overflow-hidden', classNames)}>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='aspect-video w-auto h-[min(100%,calc(100vw*9/16))]'>{children}</div>
      </div>
    </div>
  );
};
