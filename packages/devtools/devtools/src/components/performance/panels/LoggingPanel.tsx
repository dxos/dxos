//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { LogPanel } from '@dxos/react-ui-debug';

import { type CustomPanelProps, Panel } from '../Panel';

export const LoggingPanel = ({ maxLines = 100, ...props }: CustomPanelProps<{ maxLines?: number }>) => (
  <Panel {...props} icon='ph--list--regular' title='Logging'>
    <LogPanel maxLines={maxLines} initialFilter='intent-dispatcher:debug' classNames='bs-[280px]' />
  </Panel>
);
