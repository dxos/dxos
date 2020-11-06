//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';
import defaultsDeep from 'lodash/defaultsDeep';

import { Event } from '@dxos/async';
import { KeyHint } from '@dxos/credentials';
import { keyToString } from '@dxos/crypto';
import { PartyKey, PublicKey } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';

import { Item } from '../items';
import { PartyActivator, PartyInternal } from './party-internal';

export const HALO_PARTY_DESCRIPTOR_TYPE = 'wrn://dxos.org/item/halo/party-descriptor';
export const HALO_CONTACT_LIST_TYPE = 'wrn://dxos.org/item/halo/contact-list';
export const HALO_GENERAL_PREFERENCES_TYPE = 'wrn://dxos.org/item/halo/preferences';
export const HALO_DEVICE_PREFERENCES_TYPE = 'wrn://dxos.org/item/halo/device/preferences';

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
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey
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

  get preferences () {
    const globalItem = this.getGlobalPreferences();
    const deviceItem = this.getDevicePreferences();

    return defaultsDeep({}, deviceItem?.model.toObject() ?? {}, globalItem?.model.toObject() ?? {});
  }

  async close () {
    await this._party.close();
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

  isActive (partyKey: PublicKey | Uint8Array) {
    const { preferences } = this;
    const partyPrefs = preferences[keyToString(partyKey)] ?? {};
    return partyPrefs.active || undefined === partyPrefs.active;
  }

  public async setGlobalPartyPreference (partyKey: PublicKey, key: string, value: any) {
    const item = this.getGlobalPreferences();
    assert(item, 'Global preference item required.');
    return this._setPartyPreference(item, partyKey, key, value);
  }

  public async setDevicePartyPreference (partyKey: PublicKey, key: string, value: any) {
    const item = this.getDevicePreferences();
    assert(item, 'Device preference item required.');
    return this._setPartyPreference(item, partyKey, key, value);
  }

  public async _setPartyPreference (preferences: Item<any>, partyKey: PublicKey, key: string, value: any) {
    const path = keyToString(partyKey);
    const partyPrefs = preferences.model.getProperty(path, {});
    partyPrefs[key] = value;
    await preferences.model.setProperty(keyToString(partyKey), partyPrefs);
  }

  getGlobalPreferences () {
    const [globalItem] = this.itemManager.queryItems({ type: HALO_GENERAL_PREFERENCES_TYPE }).value;
    return globalItem;
  }

  getDevicePreferences () {
    const deviceItems = this.itemManager.queryItems({ type: HALO_DEVICE_PREFERENCES_TYPE }).value ?? [];
    return deviceItems.find(item => Buffer.compare(this._deviceKey, item.model.getProperty('publicKey')) === 0);
  }

  subscribeToPreferences (cb: (preferences: any) => void) {
    const globalResults = this.itemManager.queryItems({ type: HALO_GENERAL_PREFERENCES_TYPE });
    const deviceResults = this.itemManager.queryItems({ type: HALO_DEVICE_PREFERENCES_TYPE });

    const event = new Event<any>();

    let before = stableStringify(this.preferences);

    const unsubscribeGlobal = globalResults.subscribe(() => {
      const after = stableStringify(this.preferences);
      if (before !== after) {
        before = after;
        event.emit(this.preferences);
      }
    });

    const unsubscribeDevice = deviceResults.subscribe(() => {
      const after = stableStringify(this.preferences);
      if (before !== after) {
        before = after;
        event.emit(this.preferences);
      }
    });

    event.on(cb);

    return () => {
      unsubscribeGlobal();
      unsubscribeDevice();
    };
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

  createPartyActivator (partyKey: PublicKey): PartyActivator {
    return {
      isActive: () => this.isActive(partyKey),
      activate: async ({ device, global }) => {
        if (global) {
          await this.setGlobalPartyPreference(partyKey, 'active', true);
        }
        if (device || (global && device === undefined && !this.isActive(partyKey))) {
          await this.setDevicePartyPreference(partyKey, 'active', true);
        }
      },
      deactivate: async ({ device, global }) => {
        if (global) {
          await this.setGlobalPartyPreference(partyKey, 'active', false);
        }
        if (device || (global && device === undefined && this.isActive(partyKey))) {
          await this.setDevicePartyPreference(partyKey, 'active', false);
        }
      }
    };
  }
}
