//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Toolbar } from '@dxos/react-ui';

import { Timeline } from '../../components';

import { Filter, Obj } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Assistant } from '../../types';
import { type ComponentProps } from './types';

export const LoggingContainer = ({ space }: ComponentProps) => {
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const traceQueue = useQueue(chat?.traceQueue?.dxn);
  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>Timeline</Toolbar.Root>
      <Timeline
        branches={[{ name: 'main' }]}
        commits={
          traceQueue?.objects?.map((evt) => ({
            id: evt.id,
            branch: 'main',
            message: Obj.getLabel(evt) ?? evt.id,
          })) ?? []
        }
      />
    </div>
  );
};
