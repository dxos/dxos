//
// Copyright 2024 DXOS.org
//

import { ArrowsClockwise } from '@phosphor-icons/react';
import React from 'react';

import { ErrorIndicator } from './ErrorIndicator';
import { NetworkIndicator } from './NetworkIndicator';

export type StatusBarProps = {
  flushing?: boolean;
};

// TODO(burdon): Toggle network.
export const StatusBar = ({ flushing }: StatusBarProps) => {
  return (
    <div className='flex gap-1 items-center'>
      {flushing && <ArrowsClockwise className='animate-spin' />}
      <NetworkIndicator />
      <ErrorIndicator />
    </div>
  );
};
