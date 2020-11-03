//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { KeyHint, PublicKey } from '@dxos/credentials/dist/es/typedefs';
import { keyToString } from '@dxos/crypto';
import { PartyKey } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';

import { Item } from '../items';
import { PartyInternal } from './party-internal';

export const HALO_PARTY_DESCRIPTOR_TYPE = 'wrn://dxos.org/item/halo/party-descriptor';
export const HALO_CONTACT_LIST_TYPE = 'wrn://dxos.org/item/halo/contact-list';

/**
 * A record in HALO party representing a party that user is currently a member of.
 */
export interface JoinedParty {
  partyKey: PartyKey,
  keyHints: KeyHint[],
}

/**
 * Wraps PartyInternal and provides all HALO-related functionality.
 */
export class HaloParty {
  constructor (
    private readonly _party: PartyInternal,
    private readonly _identityKey: PublicKey
  ) {}

  get identityGenesis () {
    return this._party.processor.credentialMessages.get(keyToString(this._identityKey));
  }

  get identityInfo () {
    return this._party.processor.infoMessages.get(keyToString(this._identityKey));
  }

  get memberKeys () {
    return this._party.processor.memberKeys;
  }

  get credentialMessages () {
    return this._party.processor.credentialMessages;
  }

  get feedKeys () {
    return this._party.processor.feedKeys;
  }

  get invitationManager () {
    return this._party.invitationManager;
  }

  get itemManager () {
    assert(this._party.itemManager, 'HALO not open');
    return this._party.itemManager;
  }

  async recordPartyJoining (joinedParty: JoinedParty) {
    assert(this._party.itemManager, 'HALO not open');
    const knownParties = await this._party.itemManager.queryItems({ type: HALO_PARTY_DESCRIPTOR_TYPE }).value;
    const partyDesc = knownParties.find(partyMarker => Buffer.compare(partyMarker.model.getProperty('publicKey'), joinedParty.partyKey) === 0);
    assert(!partyDesc, `Descriptor already exists for Party ${keyToString(joinedParty.partyKey)}`);

    await this._party.itemManager.createItem(
      ObjectModel.meta.type,
      HALO_PARTY_DESCRIPTOR_TYPE,
      undefined,
      {
        publicKey: joinedParty.partyKey,
        subscribed: true,
        hints: joinedParty.keyHints
      }
    );
  }

  subscribeToJoinedPartyList (cb: (parties: JoinedParty[]) => void): () => void {
    const result = this.itemManager.queryItems({ type: HALO_PARTY_DESCRIPTOR_TYPE });
    return result.subscribe(async (values) => {
      cb(values.map(partyDesc => ({
        partyKey: partyDesc.model.getProperty('publicKey'),
        keyHints: Object.values(partyDesc.model.getProperty('hints')) as KeyHint[]
      })));
    });
  }

  getContactListItem (): Item<ObjectModel> | undefined {
    return this.itemManager.queryItems({ type: HALO_CONTACT_LIST_TYPE }).value[0];
  }
}
