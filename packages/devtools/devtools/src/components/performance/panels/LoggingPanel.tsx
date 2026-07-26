//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Panel as UiPanel } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

import { type CustomPanelProps, Panel } from '../Panel';

export const LoggingPanel = ({ maxLines = 100, ...props }: CustomPanelProps<{ maxLines?: number }>) => (
  <Panel {...props} icon='ph--list--regular' title='Logging' maxHeight={0}>
    <Logger.Root maxLines={maxLines} initialFilter='intent-dispatcher:debug' defaultRecording={false}>
      <UiPanel.Root classNames='bs-[280px]'>
        <UiPanel.Toolbar asChild>
          <Logger.Toolbar />
        </UiPanel.Toolbar>
        <UiPanel.Content asChild>
          <Logger.Content>
            <Logger.List />
          </Logger.Content>
        </UiPanel.Content>
        <UiPanel.Statusbar asChild>
          <Logger.Filter />
        </UiPanel.Statusbar>
      </UiPanel.Root>
    </Logger.Root>
  </Panel>
);
