//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ContainerProps = ThemedClassName<
  PropsWithChildren<{
    style?: React.CSSProperties;
  }>
>;

/**
 * Container centers the board.
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(({ children, classNames, style }, forwardedRef) => {
  return (
    <div ref={forwardedRef} style={style} className='flex w-full h-full justify-center overflow-hidden'>
      <div className={mx('max-w-full max-h-full content-center', classNames)}>{children}</div>
    </div>
  );
});
