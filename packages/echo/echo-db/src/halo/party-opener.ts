import { SubscriptionGroup, Unsubscribe } from "@dxos/util";
import { PartyManager } from "../parties";
import { HaloParty } from "./halo-party";
import debug from 'debug'

const log = debug('dxos:echo:halo:party-opener');

/**
 * Automatically adds, opens, and clothes parties from HALO preferences. 
 */
export function autoPartyOpener(halo: HaloParty, partyManager: PartyManager): Unsubscribe {
  const subs = new SubscriptionGroup();

  subs.push(halo.subscribeToJoinedPartyList(async values => {
    if (!partyManager.isOpen) {
      return;
    }

    for (const partyDesc of values) {
      if (!partyManager.parties.some(x => x.key === partyDesc.partyKey)) {
        log(`Auto-opening new Party from HALO: ${partyDesc.partyKey.toHex()}`);
        await partyManager.addParty(partyDesc.partyKey, partyDesc.keyHints);
      }
    }
  }));

  subs.push(halo.preferences.subscribeToPreferences(async () => {
    for (const party of partyManager.parties) {
      const shouldBeOpen = halo.preferences.isPartyActive(party.key);
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
}
