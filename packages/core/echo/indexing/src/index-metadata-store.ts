//
// Copyright 2024 DXOS.org
//

import { type MixedEncoding } from 'level-transcoder';

import { Event } from '@dxos/async';
import { type Heads } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';
import { type SubLevelDB, type BatchLevel } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { schema, type ObjectPointerEncoded } from '@dxos/protocols';
import { trace } from '@dxos/tracing';

import { type IdToHeads } from './types';

export type IndexMetadataStoreParams = {
  db: SubLevelDB;
};

@trace.resource()
export class IndexMetadataStore {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  /**
   * Documents that were saved by automerge-repo but maybe not indexed (also includes indexed documents).
   * ObjectPointerEncoded -> Heads
   */
  private readonly _lastSeen: SubLevelDB;

  /**
   * Documents that were indexing
   * ObjectPointerEncoded -> Heads
   */
  private readonly _lastIndexed: SubLevelDB;

  constructor({ db }: IndexMetadataStoreParams) {
    this._lastSeen = db.sublevel('last-seen', { valueEncoding: headsEncoding, keyEncoding: 'utf8' });
    this._lastIndexed = db.sublevel('last-indexed', { valueEncoding: headsEncoding, keyEncoding: 'utf8' });
  }

  @trace.span({ showInBrowserTimeline: true })
  async getDirtyDocuments(): Promise<IdToHeads> {
    return new Map(await this._lastSeen.iterator<ObjectPointerEncoded>({}).all());
  }

  /**
   * @returns All document id's that were already indexed. May include dirty documents.
   */
  async getAllIndexedDocuments(): Promise<IdToHeads> {
    return new Map(await this._lastIndexed.iterator<ObjectPointerEncoded>({}).all());
  }

  @trace.span({ showInBrowserTimeline: true })
  markDirty(idToHeads: IdToHeads, batch: BatchLevel) {
    log('mark dirty', { count: idToHeads.size });
    for (const [id, heads] of idToHeads.entries()) {
      batch.put(id, heads, { sublevel: this._lastSeen, valueEncoding: headsEncoding });
    }
  }

  /**
   * Called after leveldb batch commit.
   */
  notifyMarkedDirty() {
    this.dirty.emit();
  }

  @trace.span({ showInBrowserTimeline: true })
  markClean(idToHeads: IdToHeads, batch: BatchLevel) {
    log('mark clean', { count: idToHeads.size });
    for (const [id, heads] of idToHeads.entries()) {
      batch.put(id, heads, { sublevel: this._lastIndexed, valueEncoding: headsEncoding });
      batch.del(id, { sublevel: this._lastSeen });
    }
  }

  /**
   * Called on re-indexing.
   */
  dropFromClean(ids: ObjectPointerEncoded[], batch: BatchLevel) {
    for (const id of ids) {
      batch.del(id, { sublevel: this._lastIndexed });
    }
  }
}

const headsCodec = schema.getCodecForType('dxos.echo.query.Heads');
let showedWarning = false;
const headsEncoding: MixedEncoding<Heads, Uint8Array, Heads> = {
  encode: (value: Heads): Uint8Array => headsCodec.encode({ hashes: value }),
  decode: (encodedValue: Uint8Array): Heads => {
    try {
      return headsCodec.decode(encodedValue).hashes!;
    } catch (err) {
      // TODO(mykola): remove this before 0.7 release.
      // Migration from old format.
      if (!showedWarning) {
        showedWarning = true;
        log.warn('Detected legacy encoding of heads in the indexer. \nRun `await dxos.client.repair()`');
      }
      /**
       * Document head hashes concatenated with no  separator.
       */
      const concatenatedHeads = Buffer.from(encodedValue).toString('utf8').replace(/"/g, '');

      // Split concatenated heads into individual hashes by 64 characters.
      invariant(concatenatedHeads.length % 64 === 0, 'Invalid concatenated heads length');
      const heads = [];
      for (let i = 0; i < concatenatedHeads.length; i += 64) {
        heads.push(concatenatedHeads.slice(i, i + 64));
      }
      return heads;
    }
  },
  format: 'buffer',
};
