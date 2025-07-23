//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type GameboardContainerProps = ThemedClassName<
  PropsWithChildren<{
    style?: CSSProperties;
  }>
>;

/**
 * Container centers the board.
 */
export const GameboardContainer = forwardRef<HTMLDivElement, GameboardContainerProps>(
  ({ children, classNames, style }, forwardedRef) => {
    return (
      <div ref={forwardedRef} style={style} className='flex w-full h-full justify-center overflow-hidden'>
        <div className={mx('max-w-full max-h-full content-center', classNames)}>{children}</div>
      </div>
    );
  },
);
