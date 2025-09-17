import React from 'react';
import type { ComponentProps } from './types';
import { InvocationTraceContainer } from '@dxos/devtools';

export const InvocationsContainer = ({ space }: ComponentProps) => {
  return (
    <div className='h-full min-h-[20rem] flex items-center justify-center'>
      <InvocationTraceContainer space={space} />
    </div>
  );
};
