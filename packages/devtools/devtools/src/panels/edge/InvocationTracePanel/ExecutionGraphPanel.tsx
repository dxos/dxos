//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type Queue } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

type ExecutionGraphPanelProps = {
  queue?: Queue;
};

export const ExecutionGraphPanel: FC<ExecutionGraphPanelProps> = ({ queue }) => {
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
