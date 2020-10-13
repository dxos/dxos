//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { getPartyCredentialMessageType, PartyCredential } from '@dxos/credentials';
import { MessageSelector } from '@dxos/echo-protocol';

import { TimeframeClock } from '../items/timeframe-clock';
import { PartyProcessor } from './party-processor';

/**
 * The MessageSelector makes sure that we read in a trusted order. The first message we wish to process is
 * the PartyGenesis, which will admit a Feed. As we encounter and process FeedAdmit messages those are added
 * to the Party's trust, and we begin processing messages from them as well.
 *
 * @param partyProcessor
 * @param timeframeClock
 */
export function createMessageSelector (
  partyProcessor: PartyProcessor,
  timeframeClock: TimeframeClock
): MessageSelector {
  // TODO(telackey): Add KeyAdmit checks.
  return candidates => {
    for (let i = 0; i < candidates.length; i++) {
      const { key: feedKey, data: { halo, echo } } = candidates[i];
      const feedAdmitted = partyProcessor.isFeedAdmitted(feedKey);

      if (halo) {
        if (feedAdmitted) {
          return i;
        }

        if (partyProcessor.genesisRequired) {
          // TODO(telackey): Add check that this is for the right Party.
          if (getPartyCredentialMessageType(halo) === PartyCredential.Type.PARTY_GENESIS) {
            return i;
          }
        }
      } else if (echo && feedAdmitted) {
        assert(echo.timeframe);
        if (!timeframeClock.hasGaps(echo.timeframe)) {
          return i;
        }
      }
    }

    // Not ready for this message yet.

    return undefined;
  };
}
