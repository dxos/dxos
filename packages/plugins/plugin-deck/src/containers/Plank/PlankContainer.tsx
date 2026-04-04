//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { railGridHorizontal } from '@dxos/react-ui-stack';
import { mainIntrinsicSize, mx } from '@dxos/ui-theme';

import { useMainSize } from '../../hooks';

export type PlankContainerProps = PropsWithChildren<{ solo: boolean; companion: boolean; encapsulate: boolean }>;

export const PlankContainer = ({ children, solo, companion, encapsulate }: PlankContainerProps) => {
  const sizeAttrs = useMainSize();
  if (!solo) {
    return children;
  }

  return (
    <div
      role='none'
      data-popover-collision-boundary={true}
      className={mx(
        'absolute inset-(--main-spacing) grid',
        encapsulate && 'border border-separator rounded-sm overflow-hidden',
        companion && 'grid-cols-[6fr_4fr]', // TODO(burdon): Resize.
        railGridHorizontal,
        mainIntrinsicSize,
      )}
      {...sizeAttrs}
    >
      {children}
    </div>
  );
};
