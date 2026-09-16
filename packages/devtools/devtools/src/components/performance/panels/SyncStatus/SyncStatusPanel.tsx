//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type CustomPanelProps, Panel } from '../../Panel.tsx';
import { SyncStatus, type SyncStatusProps } from './SyncStatus.tsx';

export const SyncStatusPanel = ({ state, summary, feedState, debug, ...props }: CustomPanelProps<SyncStatusProps>) => {
  return (
    <Panel {...props} icon='ph--git-diff--regular' title='Sync'>
      <SyncStatus state={state} summary={summary} feedState={feedState} debug={debug} />
    </Panel>
  );
};
