//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';

import { type ComponentProps } from './types';

export const InvocationsModule = ({ space }: ComponentProps) => {
  const feed = space?.properties.invocationTraceFeed?.target;
  const queueDxn = feed ? Feed.getQueueDxn(feed) : undefined;
  return (
    <div className='flex h-full min-h-[20rem] items-center justify-center'>
      <InvocationTraceContainer db={space?.db} queueDxn={queueDxn} detailAxis='block' />
    </div>
  );
};
