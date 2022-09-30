//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { Timeframe } from '@dxos/protocols';
import { humanize } from '@dxos/util';

import { PartyPipeline } from '../pipeline';
import { SnapshotStore } from './snapshot-store';

const log = debug('dxos:snapshot-generator');

export const createAutomaticSnapshots = (party: PartyPipeline, timeframeUpdate: Event<Timeframe>, store: SnapshotStore, interval: number) => timeframeUpdate.on(async timeframe => {
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
