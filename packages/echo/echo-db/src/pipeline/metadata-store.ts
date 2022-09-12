//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { EchoMetadata, PartyMetadata, schema } from '@dxos/echo-protocol';
import { IdentityRecord } from '@dxos/halo-protocol';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { Directory } from '@dxos/random-access-storage';

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

const emptyEchoMetadata = (): EchoMetadata => ({
  version: STORAGE_VERSION,
  parties: [],
  created: new Date(),
  updated: new Date()
});

export class MetadataStore {
  private _metadata: EchoMetadata = emptyEchoMetadata();

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
      const { size: fileLength } = await file.stat();
      if (fileLength < 4) {
        return;
      }
      // Loading file size from first 4 bytes.
      const dataSize = fromBytesInt32(await file.read(0, 4));
      log(`Load: data size ${dataSize}`);

      // Sanity check.
      {
        if (fileLength < dataSize + 4) {
          throw new Error('Metadata storage is corrupted');
        }
      }

      const data = await file.read(4, dataSize);
      this._metadata = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').decode(data);
    } catch (err: any) {
      log(`Error loading metadata: ${err}`);
      this._metadata = emptyEchoMetadata();
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

      // Saving file size at first 4 bytes.
      log(`Save: data size ${encoded.length}`);
      await file.write(0, toBytesInt32(encoded.length));

      // Saving data.
      await file.write(4, encoded);

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

  getIdentityRecord (): IdentityRecord | undefined {
    return this._metadata.identity;
  }

  async setIdentityRecord (record: IdentityRecord) {
    assert(!this._metadata.identity, 'Cannot overwrite existing identity in metadata');

    this._metadata.identity = record;
    await this._save();
  }

  /**
   * Adds new party to store and saves it in persistent storage.
   */
  async addParty (partyKey: PublicKey): Promise<void> {
    if (this.getParty(partyKey)) {
      return;
    }
    const party: PartyMetadata = {
      record: {
        spaceKey: partyKey,
        // TODO(dmaretskyi): Refactor it so that genesis feed key is generated in advance.
        genesisFeedKey: PublicKey.from('')
      }
    };

    if (!this._metadata.parties) {
      this._metadata.parties = [party];
    } else {
      this._metadata.parties.push(party);
    }
    await this._save();
  }

  async setGenesisFeed (partyKey: PublicKey, feedKey: PublicKey): Promise<void> {
    assert(PublicKey.isPublicKey(feedKey));
    const party = this.getParty(partyKey) ?? failUndefined();
    party.record.genesisFeedKey = feedKey;
    await this._save();
  }

  /**
   * Sets the data feed key in the party specified by public key and saves updated data in persistent storage.
   * Update party's feed list.
   * Creates party if it doesn't exist. Does nothing if party already has feed with given key.
   */
  async setDataFeed (partyKey: PublicKey, feedKey: PublicKey): Promise<void> {
    // TODO(dmaretskyi): Don't create party automatically.
    if (!this.getParty(partyKey)) {
      await this.addParty(partyKey);
    }
    const party = this.getParty(partyKey) ?? failUndefined();
    party.dataFeedKey = feedKey;
    await this._save();
  }

  /**
   * Returns party with given public key.
   */
  getParty (partyKey: PublicKey): PartyMetadata | undefined {
    return this._metadata.parties?.find(party => party.record.spaceKey.equals(partyKey));
  }

  async setTimeframe (partyKey: PublicKey, timeframe: Timeframe) {
    const party = this.getParty(partyKey) ?? failUndefined();
    party.latestTimeframe = timeframe;
    await this._save();
  }
}

const toBytesInt32 = (num: number) => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(num, 0);
  return buf;
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
