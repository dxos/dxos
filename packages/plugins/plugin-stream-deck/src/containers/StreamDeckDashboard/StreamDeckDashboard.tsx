//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { type AppSurface, useProgressMonitors } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Panel } from '@dxos/react-ui';

import { useStreamDeckBridge } from '#bridge';
import { VirtualStreamDeck } from '#components';
import { toDialSpecs, toSpaceStats, useFavorites } from '#model';
import * as Protocol from '#protocol';
import { useFrame } from '#render';

export type StreamDeckDashboardProps = AppSurface.SpaceArticleProps;

// Frames are built for the Stream Deck + rather than for whatever the bridge reports: the device
// plugin fills only the slots the user actually placed, so a longer frame costs nothing, and sizing
// the frame from the connection would make the frame depend on the bridge that consumes it.
const DEVICE = Protocol.streamDeckPlus;

/**
 * Space-level panel mirroring the hardware, and — while it is open — the thing that drives it. The
 * same frame goes to both, so the panel is a faithful preview rather than a second renderer.
 */
export const StreamDeckDashboard = ({ space, role }: StreamDeckDashboardProps) => {
  const manager = usePluginManager();
  const enabled = useAtomValue(manager.enabled);
  const monitors = useProgressMonitors();
  const objects = useQuery(space.db, Filter.everything());
  const keys = useFavorites(space.db, DEVICE.keys);
  const dials = useMemo(
    () => toDialSpecs(monitors, toSpaceStats(objects, enabled.length), DEVICE.dials),
    [monitors, objects, enabled.length],
  );

  const frame = useFrame({ device: DEVICE, keys, dials });
  useStreamDeckBridge({
    frame,
    // Handling input lands in Phase 3, when a press opens the object the key names.
    onInput: (input) => log('stream deck input', { input }),
  });

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <VirtualStreamDeck device={DEVICE} frame={frame} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default StreamDeckDashboard;

StreamDeckDashboard.displayName = 'StreamDeckDashboard';
