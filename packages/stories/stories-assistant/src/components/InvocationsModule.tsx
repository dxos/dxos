//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';

import { type ModuleProps } from './types';

export const InvocationsModule = ({ space }: ModuleProps) => {
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getQueueUri(feed) : undefined;
  return (
    <div className='flex h-full min-h-[20rem] items-center justify-center'>
      <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} detailAxis='block' />
    </div>
  );
};
