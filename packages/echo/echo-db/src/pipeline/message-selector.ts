//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { getPartyCredentialMessageType, PartyCredential } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { MessageSelector } from '@dxos/echo-protocol';

import { TimeframeClock } from '../packlets/database';
import { PartyStateProvider } from './party-processor';

const log = debug('dxos:echo-db:message-selector');

/**
 * The MessageSelector makes sure that we read in a trusted order.
 * The first message we wish to process is the PartyGenesis, which will admit a Feed.
 * As we encounter and process FeedAdmit messages those are added to the Party's trust,
 * and we begin processing messages from them as well.
 *
 * @param partyProcessor
 * @param timeframeClock
 */
export const createMessageSelector = (partyProcessor: PartyStateProvider, timeframeClock: TimeframeClock): MessageSelector => candidates => {
  // Check ECHO message candidates first since they are less expensive than HALO cancidates.
  for (let i = 0; i < candidates.length; i++) {
    const { data: { timeframe, echo } } = candidates[i];
    const feedKey = PublicKey.from(candidates[i].key);
    if (!echo) {
      continue;
    }

    assert(timeframe);
    if (!timeframeClock.hasGaps(timeframe)) {
      return i;
    }
  }

  // Check HALO message candidates.
  for (let i = 0; i < candidates.length; i++) {
    const { data: { timeframe, halo } } = candidates[i];
    const feedKey = PublicKey.from(candidates[i].key);
    if (!halo) {
      continue;
    }

    assert(timeframe);
    if (!timeframeClock.hasGaps(timeframe)) {
      return i;
    }

    if (partyProcessor.genesisRequired) {
      try { // TODO(dmaretskyi): Get getPartyCredentialMessageType crashes for some reason.
        // TODO(telackey): Add check that this is for the right Party.
        if (getPartyCredentialMessageType(halo) === PartyCredential.Type.PARTY_GENESIS) {
          return i;
        }
      } catch { }
    }
  }

  // Not ready for this message yet.
  log('Skipping...');
};
