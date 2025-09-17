//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';

import type { ComponentProps } from './types';

export const InvocationsContainer = ({ space }: ComponentProps) => {
  return (
    <div className='h-full min-h-[20rem] flex items-center justify-center'>
      <InvocationTraceContainer space={space} />
    </div>
  );
};
