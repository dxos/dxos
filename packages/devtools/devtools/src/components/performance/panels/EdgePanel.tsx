//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { EdgeStatus, type QueryEdgeStatusResponse } from '@dxos/protocols/proto/dxos/client/services';

import { Panel, type CustomPanelProps } from '../Panel';

export const EdgePanel = ({ edge, ...props }: CustomPanelProps<{ edge?: QueryEdgeStatusResponse }>) => {
  const status = edge?.status ?? EdgeStatus.NOT_CONNECTED;

  return (
    <Panel
      {...props}
      icon='ph--cloud--regular'
      title='Edge'
      info={
        <div className='flex items-center gap-2'>
          <span title='Edge Router WebSocket status'>{status} WebSocket</span>
        </div>
      }
    />
  );
};
