//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { useQuery } from '@dxos/echo-react';
import * as Dashboard from '@dxos/plugin-space/Dashboard';
import * as Panel from '@dxos/react-ui/Panel';

import { VirtualStreamDeck } from '#components';
import * as Protocol from '#protocol';
import { useFrame } from '#render';
import { StreamDeckCapabilities } from '#types';

import { useFavorites } from './useFavorites.ts';

export type StreamDeckDashboardProps = AppSurface.SpaceArticleProps;

// Frames are built for the Stream Deck + rather than for whatever the bridge reports: the device
// plugin fills only the slots the user actually placed, so a longer frame costs nothing.
const DEVICE = Protocol.streamDeckPlus;

/**
 * Space-level panel previewing what the hardware shows.
 *
 * It renders the frame but does not send it: the driver capability owns the single connection, since
 * the device accepts one client and the keys must stay live with this panel closed.
 */
export const StreamDeckDashboard = ({ space, role }: StreamDeckDashboardProps) => {
  const manager = PluginManagerProvider.usePluginManager();
  const enabled = useAtomValue(manager.enabled);
  const monitors = ToolkitHooks.useProgressMonitors();
  const counts = useQuery(space.db, Dashboard.SPACE_STATS_QUERY);
  const status = Hooks.useOptionalAtomCapability(StreamDeckCapabilities.BridgeStatus);
  const keys = useFavorites(space.db, DEVICE.keys);
  const dials = useMemo(
    () => Dashboard.toMetrics(monitors, Dashboard.toSpaceStats(counts, enabled.length), DEVICE.dials),
    [monitors, counts, enabled.length],
  );
  const frame = useFrame({ device: DEVICE, keys, dials });

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <div className='flex flex-col gap-2'>
          <VirtualStreamDeck device={DEVICE} frame={frame} />
          <div className='text-xs text-description'>
            {status?.state === 'connected'
              ? (status.device?.model ?? 'Device')
              : status?.state === 'incompatible'
                ? 'Device plugin version mismatch'
                : 'No device connected'}
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

export default StreamDeckDashboard;

StreamDeckDashboard.displayName = 'StreamDeckDashboard';
