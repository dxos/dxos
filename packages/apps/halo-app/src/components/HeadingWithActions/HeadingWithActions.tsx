//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { Heading, HeadingProps } from '@dxos/react-uikit';

export interface HeadingWithActionsProps {
  heading: HeadingProps;
  actions: ReactNode;
}

export const HeadingWithActions = ({ heading, actions }: HeadingWithActionsProps) => {
  return (
    <div role='none' className='flex flex-wrap gap-x-2 gap-y-4 items-center'>
      <Heading {...heading} />
      <div role='none' className='grow-[99] min-w-[2rem]' />
      <div role='none' className='grow flex gap-2'>
        {actions}
      </div>
    </div>
  );
};
