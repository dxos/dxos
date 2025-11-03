//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';

import { type ComponentProps } from './types';

export const InvocationsModule = ({ space }: ComponentProps) => (
  <div className='flex bs-full min-bs-[20rem] items-center justify-center'>
    <InvocationTraceContainer space={space} detailAxis='block' />
  </div>
);
