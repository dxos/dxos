//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { humanize } from '@dxos/crypto';

import { TimeframeClock } from '../items/timeframe-clock';
import { SnapshotStore } from '../snapshot-store';
import { PartyInternal } from './party-internal';

const log = debug('dxos:snapshot-maker');

export function makeAutomaticSnapshots (party: PartyInternal, clock: TimeframeClock, store: SnapshotStore, interval: number) {
  return clock.update.on(async timeframe => {
    const totalMessages = timeframe.totalMessages();
    if (totalMessages > 0 && totalMessages % interval === 0) {
      log(`Saving snapshot of ${humanize(party.key)}...`);
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
