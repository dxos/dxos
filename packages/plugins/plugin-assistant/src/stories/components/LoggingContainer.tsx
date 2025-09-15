//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Timeline } from '@dxos/react-ui-components';

import { useExecutionGraph } from '../../hooks';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

export const LoggingContainer = ({ space }: ComponentProps) => {
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const { branches, commits } = useExecutionGraph(chat?.traceQueue, true);

  return <Timeline branches={branches} commits={commits} />;
};
