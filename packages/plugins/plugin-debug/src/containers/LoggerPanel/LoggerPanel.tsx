//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

export const LoggerPanel = () => (
  <Logger.Root>
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Logger.Toolbar />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Logger.Content>
          <Logger.List />
        </Logger.Content>
      </Panel.Content>
      <Panel.Statusbar asChild>
        <Logger.Filter />
      </Panel.Statusbar>
    </Panel.Root>
  </Logger.Root>
);

LoggerPanel.displayName = 'LoggerPanel';
