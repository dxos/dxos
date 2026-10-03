//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

export const LoggerPanel = () => (
  <Logger.Root>
    <Panel.Root>
      <Panel.Header>
        <Logger.Toolbar />
      </Panel.Header>
      <Panel.Body asChild>
        <Logger.Content>
          <Logger.List />
        </Logger.Content>
      </Panel.Body>
      <Panel.Footer>
        <Logger.Filter />
      </Panel.Footer>
    </Panel.Root>
  </Logger.Root>
);

LoggerPanel.displayName = 'LoggerPanel';
