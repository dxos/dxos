//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { SyncStatus, type SyncStatusProps } from './SyncStatus';
import { type CustomPanelProps, Panel } from '../../Panel';

export const SyncStatusPanel = ({ state, summary, debug, ...props }: CustomPanelProps<SyncStatusProps>) => {
  return (
    <Panel {...props} icon='ph--git-diff--regular' title='Sync'>
      <SyncStatus state={state} summary={summary} debug={debug} />
    </Panel>
  );
};
