//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Toolbar } from '@dxos/react-ui';

import { Timeline } from '../../components';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useExecutionGraph } from '../../hooks';
import { Assistant } from '../../types';
import { type ComponentProps } from './types';

export const LoggingContainer = ({ space }: ComponentProps) => {
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const { branches, commits } = useExecutionGraph(chat?.traceQueue);

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>Timeline</Toolbar.Root>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
