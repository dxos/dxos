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
    // The settings surface is a panel of its own, its header the toolbar with the connect and disconnect actions.
    <Surface.Surface type={AppSurface.ObjectProperties} data={data} />
  );
};
