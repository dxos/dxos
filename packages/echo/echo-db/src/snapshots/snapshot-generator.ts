//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { humanize } from '@dxos/util';

import { TimeframeClock } from '../packlets/database';
import { PartyPipeline } from '../pipeline';
import { SnapshotStore } from './snapshot-store';

const log = debug('dxos:snapshot-generator');

export const createAutomaticSnapshots = (party: PartyPipeline, clock: TimeframeClock, store: SnapshotStore, interval: number) => clock.update.on(async timeframe => {
  const totalMessages = timeframe.totalMessages();
  if (totalMessages > 0 && totalMessages % interval === 0) {
    log(`Saving snapshot of ${humanize(party.key)}...`);
    try {
      const snapshot = party.createSnapshot();
      await store.save(snapshot);
    } catch (err: any) {
      console.error('Failed to save snapshot');
      console.error(err);
    }
  }
});
