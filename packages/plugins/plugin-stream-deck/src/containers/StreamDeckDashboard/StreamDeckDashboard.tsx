//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { useOptionalAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { type AppSurface, useProgressMonitors } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { toMetrics, toSpaceStats } from '@dxos/plugin-space/dashboard';
import { Panel } from '@dxos/react-ui';

import { VirtualStreamDeck } from '#components';
import * as Protocol from '#protocol';
import { useFrame } from '#render';
import { StreamDeckCapabilities } from '#types';

import { useFavorites } from './useFavorites';

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
  const manager = usePluginManager();
  const enabled = useAtomValue(manager.enabled);
  const monitors = useProgressMonitors();
  const objects = useQuery(space.db, Filter.everything());
  const status = useOptionalAtomCapability(StreamDeckCapabilities.BridgeStatus);
  const keys = useFavorites(space.db, DEVICE.keys);
  const dials = useMemo(
    () => toMetrics(monitors, toSpaceStats(objects, enabled.length), DEVICE.dials),
    [monitors, objects, enabled.length],
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
