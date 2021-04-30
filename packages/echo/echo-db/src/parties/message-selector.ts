//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, getPartyCredentialMessageType, PartyCredential, admitsKeys } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { MessageSelector } from '@dxos/echo-protocol';

import { TimeframeClock } from '../items';
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
    // We go over ECHO candidates here first because checking them is way less expensive then HALO ones.
    for (let i = 0; i < candidates.length; i++) {
      const { data: { echo } } = candidates[i];
      const feedKey = PublicKey.from(candidates[i].key);
      if (!echo) {
        continue;
      }
      assert(echo.timeframe);

      if (partyProcessor.isFeedAdmitted(feedKey) && !timeframeClock.hasGaps(echo.timeframe)) {
        return i;
      }
    }

    for (let i = 0; i < candidates.length; i++) {
      const { data: { halo } } = candidates[i];
      const feedKey = PublicKey.from(candidates[i].key);
      if (!halo) {
        continue;
      }

      if (partyProcessor.isFeedAdmitted(feedKey)) {
        return i;
      }

      if (partyProcessor.genesisRequired) {
        // TODO(telackey): Add check that this is for the right Party.
        if (getPartyCredentialMessageType(halo) === PartyCredential.Type.PARTY_GENESIS) {
          return i;
        }
      } else if (getPartyCredentialMessageType(halo) === PartyCredential.Type.FEED_ADMIT) {
        if (admitsKeys(halo).find(key => key.equals(feedKey))) {
          // TODO(marik-d): Calling `Keyring.signingKeys` is expensive. Is there any way to optimize/cache this?
          for (const signedBy of Keyring.signingKeys(halo)) {
            if (partyProcessor.isMemberKey(signedBy) || signedBy.equals(partyProcessor.partyKey)) {
              return i;
            }
          }
        }
      }
    }

    // Not ready for this message yet.

    return undefined;
  };
}
