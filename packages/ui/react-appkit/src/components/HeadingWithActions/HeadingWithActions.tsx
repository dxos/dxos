//
// Copyright 2022 DXOS.org
//

import React, { type ComponentProps, type ReactNode } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { Heading, type HeadingProps } from '../Heading';

export interface HeadingWithActionsProps extends ComponentProps<'div'> {
  heading: HeadingProps;
  actions: ReactNode;
  compact?: boolean;
  spacer?: ReactNode;
}

export const HeadingWithActions = ({ heading, actions, compact, spacer, ...divProps }: HeadingWithActionsProps) => {
  return (
    <div
      role='none'
      {...divProps}
      className={mx('flex flex-wrap items-center', compact ? 'gap-2' : 'gap-x-2 gap-y-4', divProps.className)}
    >
      <Heading {...heading} />
      {typeof spacer === 'undefined' ? <div role='none' className='grow-[99] min-w-[1rem]' /> : spacer}
      <div role='none' className='flex grow gap-2 items-center'>
        {actions}
      </div>
    </div>
  );
};
