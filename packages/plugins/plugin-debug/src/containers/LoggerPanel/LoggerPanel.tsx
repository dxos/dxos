//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Logger } from '@dxos/react-ui-debug';
import { Next } from '@dxos/react-ui/next';

export const LoggerPanel = () => (
  <Logger.Root>
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Logger.Toolbar />
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Logger.Content>
          <Logger.List />
        </Logger.Content>
      </Next.Panel.Body>
      <Next.Panel.Footer>
        <Logger.Filter />
      </Next.Panel.Footer>
    </Next.Panel.Root>
  </Logger.Root>
);

LoggerPanel.displayName = 'LoggerPanel';
