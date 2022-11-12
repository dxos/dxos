//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps, ReactNode } from 'react';

import { Heading, HeadingProps } from '@dxos/react-uikit';

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
      className={cx('flex flex-wrap items-center', compact ? 'gap-2' : 'gap-x-2 gap-y-4', divProps.className)}
    >
      <Heading {...heading} />
      {typeof spacer === 'undefined' ? <div role='none' className='grow-[99] min-w-[2rem]' /> : spacer}
      <div role='none' className='flex grow gap-2'>
        {actions}
      </div>
    </div>
  );
};
