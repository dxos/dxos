//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type DatabaseInfo } from '../../../hooks/index.ts';
import { Unit, rateInterval } from '../util.tsx';

export type DatabaseCardProps = {
  database?: DatabaseInfo;
};

export const DatabaseCard = ({ database }: DatabaseCardProps) => {
  const interval = rateInterval(database?.dataStats?.meta?.rateAverageOverSeconds);
  const storage = database?.dataStats?.storage;

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--database--regular'
        hue={STAT_CARD_HUES.database}
        title='Database'
        info={`${database?.spaces ?? 0} spaces`}
      />
      <StatCard.Row label='Objects' value={(database?.objects?.alive ?? 0).toLocaleString()} />
      <StatCard.Row label='Objects (deleted)' value={(database?.objects?.deleted ?? 0).toLocaleString()} />
      <StatCard.Row label='Documents' value={(database?.storedDocuments ?? 0).toLocaleString()} />
      <StatCard.Row label='Feeds' value={(database?.feeds?.count ?? 0).toLocaleString()} />
      <StatCard.Row label='Feed blocks' value={(database?.feeds?.blocks ?? 0).toLocaleString()} />
      <StatCard.Row label='Documents (loaded)' value={(database?.documents ?? 0).toLocaleString()} />
      <StatCard.Row label='Documents (syncing)' value={(database?.documentsToReconcile ?? 0).toLocaleString()} />
      <StatCard.Row label={`Read rate${interval}`} value={storage?.reads?.countPerSecond ?? 0} unit='op/s' />
      <StatCard.Row label='Read duration' value={storage?.reads?.opDuration ?? 0} unit='ms' />
      <StatCard.Row label='Read chunk size' value={Unit.KB(storage?.reads?.payloadSize)} unit='KB' />
      <StatCard.Row label={`Write rate${interval}`} value={storage?.writes?.countPerSecond ?? 0} unit='op/s' />
      <StatCard.Row label='Write duration' value={storage?.writes?.opDuration ?? 0} unit='ms' />
      <StatCard.Row label='Write chunk size' value={Unit.KB(storage?.writes?.payloadSize)} unit='KB' />
    </StatCard.Root>
  );
};

DatabaseCard.displayName = 'DatabaseCard';
