//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps, FC, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type ContainerProps = {
  children?: ReactNode;
  className?: string;
  scrollX?: boolean;
  scrollY?: boolean;
} & Omit<ComponentProps<'div'>, 'className' | 'children'>;

/**
 * Expandable container with optional scrolling.
 */
export const ScrollContainer: FC<ContainerProps> = ({ scrollX, scrollY, className, children }) => {
  return (
    <div className={mx('flex', scrollX && 'overflow-x-auto', scrollY && 'overflow-y-auto', className)}>
      <div className='flex'>{children}</div>
    </div>
  );
};
