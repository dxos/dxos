//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Toolbar } from '@dxos/react-ui';

import { Timeline } from '../../components';

import { type ComponentProps } from './types';

export const LoggingContainer = (_: ComponentProps) => {
  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>Timeline</Toolbar.Root>
      <Timeline branches={[]} commits={[]} />
    </div>
  );
};
