//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { TimeframeClock } from '../items';
import { PartyInternal } from '../parties';
import { SnapshotStore } from './snapshot-store';

const log = debug('dxos:snapshot-generator');

export function createAutomaticSnapshots (
  party: PartyInternal, clock: TimeframeClock, store: SnapshotStore, interval: number
) {
  return clock.update.on(async timeframe => {
    const totalMessages = timeframe.totalMessages();
    if (totalMessages > 0 && totalMessages % interval === 0) {
      log(`Saving snapshot of ${party.key.humanize()}...`);
      try {
        const snapshot = party.createSnapshot();
        await store.save(snapshot);
      } catch (err) {
        console.error('Failed to save snapshot');
        console.error(err);
      }
    }
  });
}
