//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type { NetworkStatus } from '@dxos/client/mesh';
import { ConnectionState } from '@dxos/network-manager';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';

export type NetworkCardProps = {
  network?: NetworkStatus;
};

export const NetworkCard = ({ network }: NetworkCardProps) => {
  const swarms = network?.connectionInfo ?? [];
  const connections = swarms.reduce(
    (acc, info) => acc + (info.connections?.filter((conn) => conn.state === ConnectionState.CONNECTED).length ?? 0),
    0,
  );

  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--wifi-high--regular' hue={STAT_CARD_HUES.system} title='Network' />
      <StatCard.Row label='Connections' value={connections.toLocaleString()} />
      <StatCard.Row label='Swarms' value={swarms.length.toLocaleString()} />
    </StatCard.Root>
  );
};

NetworkCard.displayName = 'NetworkCard';
