//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar } from '@dxos/react-ui';

import { type ModuleProps } from './types';

/**
 * Renders the assistant `TracePanel` (process tree + execution-graph timeline) for the story space.
 */
export const TraceModule = (_: ModuleProps) => {
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Trace</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Surface.Surface type={AppSurface.deckCompanion('trace')} data={{ subject: 'trace' }} />
      </Panel.Content>
    </Panel.Root>
  );
};
