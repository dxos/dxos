//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type CustomPanelProps, Panel } from '../../Panel';

import { SyncStatus, type SyncStatusProps } from './SyncStatus';

export const SyncStatusPanel = ({ state, summary, debug, ...props }: CustomPanelProps<SyncStatusProps>) => (
  <Panel {...props} icon='ph--git-diff--regular' title='Sync'>
    <SyncStatus state={state} summary={summary} debug={debug} />
  </Panel>
);
