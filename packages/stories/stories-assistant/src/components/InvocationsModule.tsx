//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';

import { type ComponentProps } from './types';

export const InvocationsModule = ({ space }: ComponentProps) => {
  const queueDxn = space?.properties.invocationTraceQueue?.dxn;
  return (
    <div className='flex bs-full min-bs-[20rem] items-center justify-center'>
      <InvocationTraceContainer db={space?.db} queueDxn={queueDxn} detailAxis='block' />
    </div>
  );
};
