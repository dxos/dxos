//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { type Queue, useQuery } from '@dxos/react-client/echo';
import { Timeline } from '@dxos/react-ui-components';

import { useExecutionGraph } from '../../hooks';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';

export const LoggingContainer = ({ space, traceQueue }: ComponentProps & { traceQueue?: Queue }) => {
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const { branches, commits } = useExecutionGraph(traceQueue ?? chat?.traceQueue?.target, true);

  return <Timeline branches={branches} commits={commits} />;
};
