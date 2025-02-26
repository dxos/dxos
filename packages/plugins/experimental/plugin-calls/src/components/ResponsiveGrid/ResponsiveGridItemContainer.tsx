//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

/**
 * Container centers largest child with aspect ratio.
 */
export const ResponsiveGridItemContainer = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div role='none' className='flex w-full h-full overflow-hidden justify-center items-center'>
      <div role='none' className={mx('flex max-w-full max-h-full aspect-video overflow-hidden', classNames)}>
        {children}
      </div>
    </div>
  );
};
