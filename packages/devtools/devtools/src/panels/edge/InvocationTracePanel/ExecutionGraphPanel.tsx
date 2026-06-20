//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type Obj } from '@dxos/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

type ExecutionGraphPanelProps = {
  objects: readonly Obj.Unknown[];
};

export const ExecutionGraphPanel: FC<ExecutionGraphPanelProps> = ({ objects }) => {
  const { branches, commits } = useExecutionGraph(objects);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
