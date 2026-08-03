//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { TracePanel } from '@dxos/plugin-assistant/components';
import { type Space } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

/**
 * Renders the assistant `TracePanel` (process tree + execution-graph timeline) for the story space.
 */
export const TraceModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <TraceModuleContainer space={space} attendableId={data?.attendableId} />;
};

const TraceModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Trace</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <TracePanel space={space} attendableId={attendableId ?? space.id} />
      </Panel.Content>
    </Panel.Root>
  );
};
