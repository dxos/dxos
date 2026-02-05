//
// Copyright 2024 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import { type MixedEncoding } from 'level-transcoder';

import { Event } from '@dxos/async';
import type { ProtoCodec } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { type BatchLevel, type SublevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { type ObjectPointerEncoded, objectPointerCodec } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type Heads as HeadsProto } from '@dxos/protocols/proto/dxos/echo/query';
import { trace } from '@dxos/tracing';
import { joinTables } from '@dxos/util';

import { type IdToHeads } from '../types';

export type IndexMetadataStoreProps = {
  db: SublevelDB;
};

@trace.resource()
export class IndexMetadataStore {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  /**
   * Documents that were saved by automerge-repo but maybe not indexed (also includes indexed documents).
   * ObjectPointerEncoded -> Heads
   */
  private readonly _lastSeen: SublevelDB;

  /**
   * Documents that were indexing
   * ObjectPointerEncoded -> Heads
   */
  private readonly _lastIndexed: SublevelDB;

  constructor({ db }: IndexMetadataStoreProps) {
    this._lastSeen = db.sublevel('last-seen', { valueEncoding: headsEncoding, keyEncoding: 'utf8' });
    this._lastIndexed = db.sublevel('last-indexed', { valueEncoding: headsEncoding, keyEncoding: 'utf8' });

    trace.diagnostic({
      id: 'indexed-documents',
      name: 'Indexed Documents',
      fetch: async () => {
        const [dirty, indexed] = await Promise.all([this.getDirtyDocuments(), this.getAllIndexedDocuments()]);

        return joinTables(
          'id',
          'id',
          Array.from(dirty.entries()).map(([id, heads]) => ({ id, dirtyHeads: heads.join(',') })),
          Array.from(indexed.entries()).map(([id, heads]) => ({ id, indexedHeads: heads.join(',') })),
        );
      },
    });
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
  markDirty(idToHeads: IdToHeads, batch: BatchLevel): void {
    log('mark dirty', { count: idToHeads.size });
    for (const [id, heads] of idToHeads.entries()) {
      batch.put(id, heads, { sublevel: this._lastSeen, valueEncoding: headsEncoding });

      // Delete old v0 entries.
      batch.del(objectPointerCodec.convertV1ToV0(id), { sublevel: this._lastIndexed });
    }
  }

  /**
   * Called after leveldb batch commit.
   */
  notifyMarkedDirty(): void {
    this.dirty.emit();
  }

  @trace.span({ showInBrowserTimeline: true })
  markClean(idToHeads: IdToHeads, batch: BatchLevel): void {
    log('mark clean', { count: idToHeads.size });
    for (const [id, heads] of idToHeads.entries()) {
      batch.put(id, heads, { sublevel: this._lastIndexed, valueEncoding: headsEncoding });
      batch.del(id, { sublevel: this._lastSeen });

      // Delete old v0 entries.
      batch.del(objectPointerCodec.convertV1ToV0(id), { sublevel: this._lastIndexed });
      batch.del(objectPointerCodec.convertV1ToV0(id), { sublevel: this._lastSeen });
    }
  }

  /**
   * Called on re-indexing.
   */
  dropFromClean(ids: ObjectPointerEncoded[], batch: BatchLevel): void {
    for (const id of ids) {
      batch.del(id, { sublevel: this._lastIndexed });
    }
  }
}

// NOTE: Lazy so that code that doesn't use indexing doesn't need to load the codec (breaks in workerd).
let headsCodec!: ProtoCodec<HeadsProto>;
const getHeadsCodec = () => (headsCodec ??= schema.getCodecForType('dxos.echo.query.Heads'));

let showedWarning = false;
export const headsEncoding: MixedEncoding<Heads, Uint8Array, Heads> = {
  encode: (value: Heads): Uint8Array => getHeadsCodec().encode({ hashes: value }),
  decode: (encodedValue: Uint8Array): Heads => {
    try {
      return getHeadsCodec().decode(encodedValue).hashes!;
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
