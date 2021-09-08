//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import pify from 'pify';

import { EchoMetadata, schema } from '@dxos/echo-protocol';
import { IStorage } from '@dxos/random-access-multi-storage';
import { PublicKey } from '@dxos/crypto';

const log = debug('dxos:snapshot-store');

export class MetadataStore {
  private _metadata: EchoMetadata = {};

  constructor (
    private readonly _storage: IStorage
  ) {}

  get parties () {
    return this._metadata.parties ?? [];
  }

  /**
   * Loads metadata from persistent storage.
   */
  async load () {
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

  private async _save () {
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
  async clear () {
    log('Clearing all echo metadata...');
    await this._storage.destroy();
  }

  /**
   * Adds new party to store and saves it in persistent storage.
   */
  async addParty (partyKey: PublicKey) {
    if (!this._metadata.parties) {
      this._metadata.parties = [{ key: partyKey }];
    } else {
      this._metadata.parties.push({ key: partyKey });
    }
    await this._save();
  }

  /**
   * Adds feed key to the party specified by public key and saves updated data in persistent storage.
   * Creates party if it doesn't exist.
   */
  async addPartyFeed (partyKey: PublicKey, feedKey: PublicKey) {
    if (!this.hasParty(partyKey)) {
      await this.addParty(partyKey);
    }
    for (const party of this._metadata.parties ?? []) {
      if (party.key && partyKey.equals(party.key)) {
        if (party.feedKeys) {
          party.feedKeys.push(feedKey);
        } else {
          party.feedKeys = [feedKey];
        }
        break;
      }
    }
    await this._save();
  }

  /**
   * Checks if there is a party with given public key.
   */
  hasParty (partyKey: PublicKey): boolean {
    return !!this._metadata.parties?.some(party => party.key && partyKey.equals(party.key));
  }
}
