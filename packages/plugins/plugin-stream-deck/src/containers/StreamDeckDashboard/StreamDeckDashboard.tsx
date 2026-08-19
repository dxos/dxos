//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useProgressMonitors } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { VirtualStreamDeck } from '#components';
import { toDialSpecs, toSpaceStats, useFavorites } from '#model';
import { Protocol } from '#protocol';

export type StreamDeckDashboardProps = AppSurface.SpaceArticleProps;

/**
 * Space-level panel mirroring what the hardware shows. Until the device bridge lands this is the
 * whole feature surface; afterwards it stays the way to see the dashboard without the device.
 */
export const StreamDeckDashboard = ({ space, role }: StreamDeckDashboardProps) => {
  const device = Protocol.streamDeckPlus;
  const manager = usePluginManager();
  const enabled = useAtomValue(manager.enabled);
  const keys = useFavorites(space.db, device.keys);
  const objects = useQuery(space.db, Filter.everything());
  const monitors = useProgressMonitors();
  const dials = useMemo(
    () => toDialSpecs(monitors, toSpaceStats(objects, enabled.length), device.dials),
    [monitors, objects, enabled.length, device.dials],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <VirtualStreamDeck device={device} keys={keys} dials={dials} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default StreamDeckDashboard;

StreamDeckDashboard.displayName = 'StreamDeckDashboard';
