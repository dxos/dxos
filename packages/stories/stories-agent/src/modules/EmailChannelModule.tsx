//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter } from '@dxos/echo';
import * as AgentEmail from '@dxos/plugin-agent/AgentEmail';
import { useQuery } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Channel } from '@dxos/types';

/**
 * The space's email channel's settings (address, display name, allowed senders) and its mailbox on EDGE, through the
 * surface plugin-agent contributes to an email channel's properties; Activity lists the channel but not its address.
 */
export const EmailChannelModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const channels = useQuery(space?.db, Filter.type(Channel.Channel));
  const channel = channels.find(({ backend }) => backend.kind === AgentEmail.BACKEND_KIND);
  const data = useMemo(() => (channel ? { subject: channel } : undefined), [channel]);
  if (!data) {
    return null;
  }

  return (
    <Panel.Root data-testid='email-channel'>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Email</Toolbar.Text>
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
