//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';

import { type ComponentProps } from './types';

export const InvocationsModule = ({ space }: ComponentProps) => {
  return (
    <div className='flex h-full min-h-[20rem] items-center justify-center'>
      <InvocationTraceContainer db={space?.db} detailAxis='block' />
    </div>
  );
};
