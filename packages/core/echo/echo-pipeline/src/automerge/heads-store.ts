//
// Copyright 2024 DXOS.org
//

import type { Heads } from '@automerge/automerge';
import type { DocumentId } from '@automerge/automerge-repo';
import { type MixedEncoding } from 'level-transcoder';

import type { BatchLevel, SublevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { create, toBinary, fromBinary } from '@dxos/protocols/buf';
import { HeadsSchema } from '@dxos/protocols/buf/dxos/echo/query_pb';

const headsEncoding: MixedEncoding<Heads, Uint8Array, Heads> = {
  encode: (value: Heads): Uint8Array => toBinary(HeadsSchema, create(HeadsSchema, { hashes: value })),
  decode: (encodedValue: Uint8Array): Heads => {
    try {
      return fromBinary(HeadsSchema, encodedValue).hashes;
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
