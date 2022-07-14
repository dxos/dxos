//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { KeyType } from '@dxos/credentials';
import { SubscriptionGroup, Unsubscribe } from '@dxos/util';

import { PartyManager } from '../parties';
import { Preferences } from './preferences';

const log = debug('dxos:echo-db:party-opener');

/**
 * Automatically adds, opens, and clothes parties from HALO preferences.
 */
export const autoPartyOpener = (preferences: Preferences, partyManager: PartyManager): Unsubscribe => {
  const subs = new SubscriptionGroup();

  subs.push(preferences.subscribeToJoinedPartyList(async values => {
    if (!partyManager.isOpen) {
      return;
    }

    for (const partyDesc of values) {
      if (!partyManager.parties.some(x => x.key === partyDesc.partyKey)) {
        log(`Auto-opening new Party from HALO: ${partyDesc.partyKey.toHex()} hints=${JSON.stringify(partyDesc.keyHints)}`);
        const feedHints = partyDesc.keyHints.filter(hint => hint.type === KeyType.FEED).map(hint => hint.publicKey!);
        await partyManager.addParty(partyDesc.partyKey, partyDesc.genesisFeed, feedHints);
      }
    }
  }));

  subs.push(preferences.subscribeToPreferences(async () => {
    for (const party of partyManager.parties) {
      const shouldBeOpen = preferences.isPartyActive(party.key);
      if (party.isOpen && !shouldBeOpen) {
        log(`Auto-closing deactivated party: ${party.key.toHex()}`);

        await party.close();
      } else if (!party.isOpen && shouldBeOpen) {
        log(`Auto-opening activated party: ${party.key.toHex()}`);

        await party.open();
      }
    }
  }));

  return () => subs.unsubscribe();
};
