//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps } from 'react';

import { mx } from '@dxos/react-components';

import { JoinDispatch } from '../JoinPanelProps';

export interface ViewStateProps extends ComponentProps<'div'> {
  active: boolean;
  dispatch: JoinDispatch;
}

export const ViewState = ({ active, children, className, dispatch, ...props }: ViewStateProps) => {
  // note (thure): reserve `order-1` and `order-3` for outgoing steps in different directions
  return (
    <div
      role='group'
      {...props}
      {...(!active && { 'aria-hidden': true })}
      className={mx('is-[50%] flex flex-col gap-1 p-2', active ? 'order-2' : 'order-4', className)}
    >
      {children}
    </div>
  );
};
