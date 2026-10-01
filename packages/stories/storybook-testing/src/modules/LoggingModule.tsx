//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui';
import { Logger } from '@dxos/react-ui-debug';

/**
 * Renders the `@dxos/react-ui-debug` {@link Logger} composite — a live `@dxos/log` viewer with
 * level filter, per-file levels, a text-match buffer filter, and record controls — assembled as a story module.
 */
export const LoggingModule = () => (
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
