//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

/**
 * Renders the `@dxos/react-ui-debug` {@link Logger} composite — a live `@dxos/log` viewer with
 * level filter, per-file levels, a text-match buffer filter, and record controls — assembled as a story module.
 */
export const LoggingModule = () => (
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
