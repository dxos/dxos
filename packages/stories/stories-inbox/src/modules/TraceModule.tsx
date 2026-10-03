//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as TracePanel from '@dxos/plugin-assistant/TracePanel';
import { type Space } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/**
 * Renders the assistant `TracePanel` (process tree + execution-graph timeline) for the story space.
 */
export const TraceModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }
  return <TraceModuleContainer space={space} attendableId={data?.attendableId} />;
};

const TraceModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Trace</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <TracePanel.Root space={space} attendableId={attendableId ?? space.id} />
      </Panel.Body>
    </Panel.Root>
  );
};
