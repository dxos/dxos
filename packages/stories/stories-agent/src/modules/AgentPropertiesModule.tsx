//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/**
 * The space's first agent's configuration, through the plugin surfaces that contribute the Agent's object
 * properties (plugin-assistant's `AgentProperties`), as Composer's Properties panel shows them.
 */
export const AgentPropertiesModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  const data = useMemo(() => (agent ? { subject: agent } : undefined), [agent]);
  if (!data) {
    return null;
  }

  return (
    <Panel.Root data-testid='agent-properties'>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Agent</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Surface.Surface type={AppSurface.ObjectProperties} data={data} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
