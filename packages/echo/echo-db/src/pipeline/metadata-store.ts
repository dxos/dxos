//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { synchronized } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { EchoMetadata, PartyMetadata, schema } from '@dxos/echo-protocol';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { Directory } from '@dxos/random-access-multi-storage';

/**
 * Version for the schema of the stored data as defined in dxos.echo.metadata.EchoMetadata.
 *
 * Should be incremented every time there's a breaking change to the stored data.
 */
export const STORAGE_VERSION = 1;

const log = debug('dxos:snapshot-store');

export interface AddPartyOptions {
  key: PublicKey
  genesisFeed: PublicKey
}

export class MetadataStore {
  private _metadata: EchoMetadata = {
    version: STORAGE_VERSION,
    parties: [],
    created: new Date(),
    updated: new Date()
  };

  constructor (
    private readonly _directory: Directory
  ) {}

  get version (): number {
    return this._metadata.version ?? 0;
  }

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
  @synchronized
  async load (): Promise<void> {
    const file = this._directory.createOrOpen('EchoMetadata');
    try {
      const { size } = await file.stat();
      if (size === 0) {
        return;
      }

      const data = await file.read(0, size);
      this._metadata = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').decode(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return;
      } else {
        throw err;
      }
    } finally {
      await file.close();
    }
  }

  @synchronized
  private async _save (): Promise<void> {
    const data: EchoMetadata = {
      ...this._metadata,
      version: STORAGE_VERSION,
      created: this._metadata.created ?? new Date(),
      updated: new Date()
    };

    const file = this._directory.createOrOpen('EchoMetadata');

    try {
      const encoded = Buffer.from(schema.getCodecForType('dxos.echo.metadata.EchoMetadata').encode(data));
      await file.write(0, encoded);

      // Truncate the rest of the file.
      {
        const { size } = await file.stat();
        if (size > encoded.length) {
          await file.truncate(encoded.length, size);
        }
      }

      // Sanity check.
      const { size } = await file.stat();
      if (size !== encoded.length) {
        console.log('SANITY!');
      }
      assert(size === encoded.length);
    } finally {
      await file.close();
    }
  }

  /**
   * Clears storage - doesn't work for now.
   */
  async clear (): Promise<void> {
    log('Clearing all echo metadata...');
    await this._directory.delete();
  }

  /**
   * Adds new party to store and saves it in persistent storage.
   */
  async addParty (partyKey: PublicKey): Promise<void> {
    if (this.getParty(partyKey)) {
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
    if (this.hasFeed(partyKey, feedKey)) {
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

  async setGenesisFeed (partyKey: PublicKey, feedKey: PublicKey): Promise<void> {
    assert(PublicKey.isPublicKey(feedKey));
    await this.addPartyFeed(partyKey, feedKey);
    const party = this.getParty(partyKey) ?? failUndefined();
    party.genesisFeedKey = feedKey;
    await this._save();
  }

  /**
   * Sets the data feed key in the party specified by public key and saves updated data in persistent storage.
   * Update party's feed list.
   * Creates party if it doesn't exist. Does nothing if party already has feed with given key.
   */
  async setDataFeed (partyKey: PublicKey, feedKey: PublicKey): Promise<void> {
    await this.addPartyFeed(partyKey, feedKey);
    const party = this.getParty(partyKey) ?? failUndefined();
    party.dataFeedKey = feedKey;
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

  async setTimeframe (partyKey: PublicKey, timeframe: Timeframe) {
    const party = this.getParty(partyKey) ?? failUndefined();
    party.latestTimeframe = timeframe;
    await this._save();
  }
}
