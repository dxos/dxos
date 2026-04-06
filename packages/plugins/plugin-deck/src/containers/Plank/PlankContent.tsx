//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { railGridHorizontal } from '@dxos/react-ui-stack';
import { composable, composableProps, mainIntrinsicSize } from '@dxos/ui-theme';

import { useMainSize } from '#hooks';

export type PlankContentProps = PropsWithChildren<{
  solo: boolean;
  companion: boolean;
  encapsulate: boolean;
}>;

export const PlankContent = composable<HTMLDivElement, PlankContentProps>(
  ({ children, solo, companion, encapsulate, ...props }, forwardedRef) => {
    const sizeAttrs = useMainSize();
    if (!solo) {
      return children;
    }

    return (
      <div
        {...sizeAttrs}
        {...composableProps(props, {
          role: 'none',
          classNames: [
            'absolute inset-(--main-spacing) grid',
            encapsulate && 'border border-separator rounded-sm overflow-hidden',
            companion && 'grid-cols-[6fr_4fr]', // Ration of primary to companion.
            railGridHorizontal,
            mainIntrinsicSize,
          ],
        })}
        data-popover-collision-boundary={true}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);
