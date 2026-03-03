//
// Copyright 2024 DXOS.org
//

import type { Heads } from '@automerge/automerge';
import type { DocumentId } from '@automerge/automerge-repo';
import { type MixedEncoding } from 'level-transcoder';

import type { ProtoCodec } from '@dxos/codec-protobuf';
import type { BatchLevel, SublevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';
import type { Heads as HeadsProto } from '@dxos/protocols/proto/dxos/echo/query';

// NOTE: Lazy so that code that doesn't use indexing doesn't need to load the codec (breaks in workerd).
let headsCodec: ProtoCodec<HeadsProto>;
const getHeadsCodec = () => (headsCodec ??= schema.getCodecForType('dxos.echo.query.Heads'));

const headsEncoding: MixedEncoding<Heads, Uint8Array, Heads> = {
  encode: (value: Heads): Uint8Array => getHeadsCodec().encode({ hashes: value }),
  decode: (encodedValue: Uint8Array): Heads => {
    try {
      return getHeadsCodec().decode(encodedValue).hashes!;
    } catch {
      // Legacy encoding migration path.
      log.warn('Detected legacy encoding of heads in storage.');
      const concatenatedHeads = Buffer.from(encodedValue).toString('utf8').replace(/"/g, '');
      const heads = [];
      for (let i = 0; i < concatenatedHeads.length; i += 64) {
        heads.push(concatenatedHeads.slice(i, i + 64));
      }
      return heads;
    }
  },
  format: 'buffer',
};

export type HeadsStoreProps = {
  db: SublevelDB;
};

export class HeadsStore {
  private readonly _db: SublevelDB;

  constructor({ db }: HeadsStoreProps) {
    this._db = db;
  }

  setHeads(documentId: DocumentId, heads: Heads, batch: BatchLevel): void {
    batch.put<DocumentId, Heads>(documentId, heads, {
      sublevel: this._db,
      keyEncoding: 'utf8',
      valueEncoding: headsEncoding,
    });
  }

  // TODO(dmaretskyi): Make batched.
  async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {
    return this._db.getMany<DocumentId, Heads>(documentIds, {
      keyEncoding: 'utf8',
      valueEncoding: headsEncoding,
    });
  }

  /**
   * Iterate over all document IDs and their heads.
   */
  async *iterateAll(): AsyncGenerator<{ documentId: DocumentId; heads: Heads }> {
    for await (const [documentId, heads] of this._db.iterator<DocumentId, Heads>({
      keyEncoding: 'utf8',
      valueEncoding: headsEncoding,
    })) {
      yield { documentId, heads };
    }
  }
}
