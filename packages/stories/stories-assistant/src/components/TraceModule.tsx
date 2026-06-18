//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { TracePanel } from '@dxos/plugin-assistant/components';
import { Panel, Toolbar } from '@dxos/react-ui';

import { type ModuleProps } from './types';

/**
 * Renders the assistant `TracePanel` (process tree + execution-graph timeline) for the story space.
 */
export const TraceModule = ({ space }: ModuleProps) => {
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Trace</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <TracePanel space={space} attendableId={space.id} />
      </Panel.Content>
    </Panel.Root>
  );
};
