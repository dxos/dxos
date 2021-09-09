//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';

import { EchoMetadata, PartyMetadata, schema } from '@dxos/echo-protocol';
import { IStorage } from '@dxos/random-access-multi-storage';
import { PublicKey } from '@dxos/crypto';

const log = debug('dxos:snapshot-store');

export class MetadataStore {
  private _metadata: EchoMetadata = {};

  constructor (
    private readonly _storage: IStorage
  ) {}

  /**
   * Returns a list of currently saved parties. The list and objects in it can be modified addParty and
   * addPartyFeed functions.
   */
  get parties (): PartyMetadata[] {
    return this._metadata.parties ?? [];
  }

  /**
   * Loads metadata from persistent storage.
   */
  async load (): Promise<void> {
    const file = this._storage.createOrOpen('EchoMetadata');
    try {
      const { size } = await pify(file.stat.bind(file))();
      if (size === 0) {
        this._metadata = { parties : [] };
        return;
      }

      const data = await pify(file.read.bind(file))(0, size);
      this._metadata = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').decode(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        this._metadata = { parties : [] };
        return;
      } else {
        throw err;
      }
    } finally {
      await pify(file.close.bind(file))();
    }
  }

  private async _save (): Promise<void> {
    const file = this._storage.createOrOpen('EchoMetadata');

    try {
      const data = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').encode(this._metadata);
      await pify(file.write.bind(file))(0, data);
    } finally {
      await pify(file.close.bind(file))();
    }
  }

  /**
   * Clears storage - doesn't work for now.
   */
  async clear (): Promise<void> {
    log('Clearing all echo metadata...');
    await this._storage.destroy();
  }

  /**
   * Adds new party to store and saves it in persistent storage.
   */
  async addParty (partyKey: PublicKey): Promise<void> {
    if (!!this.getParty(partyKey)) {
      return;
    }
    if (!this._metadata.parties) {
      this._metadata.parties = [{ key: partyKey }];
    } else {
      this._metadata.parties.push({ key: partyKey });
    }
    await this._save();
  }

  /**
   * Adds feed key to the party specified by public key and saves updated data in persistent storage.
   * Creates party if it doesn't exist. Does nothing if party already has feed with given key.
   */
  async addPartyFeed (partyKey: PublicKey, feedKey: PublicKey): Promise<void> {
    if (!!this.hasFeed(partyKey, feedKey)) {
      return;
    }
    if (!this.getParty(partyKey)) {
      await this.addParty(partyKey);
    }
    const party = this.getParty(partyKey);
    assert(party);
    if (party.feedKeys) {
      party.feedKeys.push(feedKey);
    } else {
      party.feedKeys = [feedKey];
    }
    await this._save();
  }

  /**
   * Returns party with given public key.
   */
  getParty (partyKey: PublicKey): PartyMetadata | undefined {
    return this._metadata.parties?.find(party => party.key && partyKey.equals(party.key));
  }

  /**
   * Checks if a party with given key has a feed with given key.
   */
  hasFeed (partyKey: PublicKey, feedKey: PublicKey): boolean {
    const party = this.getParty(partyKey);
    if (!party) {
      return false;
    }
    return !!party.feedKeys?.find(fk => feedKey.equals(fk));
  }
}
