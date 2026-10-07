//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type DatabaseInfo } from '../../../hooks/index.ts';
import { Unit, rateInterval } from '../util.tsx';

export type ReplicatorCardProps = {
  database?: DatabaseInfo;
};

export const ReplicatorCard = ({ database }: ReplicatorCardProps) => {
  const interval = rateInterval(database?.dataStats?.meta?.rateAverageOverSeconds);
  const replicator = database?.dataStats?.replicator;

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--arrows-left-right--regular'
        hue={STAT_CARD_HUES.database}
        title='Replicator'
        info={`${replicator?.connections ?? 0} connections`}
      />
      <StatCard.Row
        label={`Receive rate${interval}`}
        value={replicator?.receivedMessages?.countPerSecond ?? 0}
        unit='op/s'
      />
      <StatCard.Row label='Receive size' value={Unit.KB(replicator?.receivedMessages?.payloadSize)} unit='KB' />
      <StatCard.Row label={`Send rate${interval}`} value={replicator?.sentMessages?.countPerSecond ?? 0} unit='op/s' />
      <StatCard.Row label='Send size' value={Unit.KB(replicator?.sentMessages?.payloadSize)} unit='KB' />
      <StatCard.Row
        label='Send failures'
        value={replicator?.sentMessages?.failedPerSecond ?? 0}
        unit='err/s'
        warning={(replicator?.sentMessages?.failedPerSecond ?? 0) > 0}
      />
      <StatCard.Row label='Send duration' value={replicator?.sentMessages?.opDuration ?? 0} unit='ms' />
    </StatCard.Root>
  );
};

ReplicatorCard.displayName = 'ReplicatorCard';
