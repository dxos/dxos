//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { invariant } from '@dxos/invariant';
import { type SublevelDB } from '@dxos/kv-store';
import { type IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import { IndexConstructors } from './index-constructors';
import { type Index } from './types';

const CODEC_VERSION = 2;

type IndexData = {
  kind: IndexKind;
  index: string;
  version: number;
};

export type IndexStoreParams = {
  db: SublevelDB;
};

// TODO(mykola): Delete header from storage codec.
export class IndexStore {
  private readonly _db: SublevelDB;
  constructor({ db }: IndexStoreParams) {
    this._db = db;

    trace.diagnostic({
      id: 'indexes',
      name: 'Indexes',
      fetch: async () => {
        const indexes = await this._db.iterator<string, IndexData>(encodings).all();
        return indexes.map(([identifier, { index, ...rest }]) => ({
          identifier,
          ...rest,
        }));
      },
    });
  }

  async save(index: Index) {
    await this._db.put<string, IndexData>(index.identifier, await indexCodec.encode(index), encodings);
  }

  async load(identifier: string): Promise<Index> {
    const data = await this._db.get<string, IndexData>(identifier, encodings);
    return indexCodec.decode(identifier, data);
  }

  async remove(identifier: string) {
    await this._db.del(identifier, encodings);
  }

  /**
   *
   * @returns Map of index identifiers vs their kinds.
   */
  async loadIndexKindsFromDisk(): Promise<Map<string, IndexKind>> {
    const kinds = new Map<string, IndexKind>();

    for await (const [identifier, data] of this._db.iterator<string, IndexData>(encodings)) {
      data.kind && kinds.set(identifier, data.kind);
    }

    // Delete all indexes that are colliding with the same kind.
    {
      const seenKinds: IndexKind[] = [];
      const allKinds = Array.from(kinds.values());
      for (const kind of allKinds) {
        if (!seenKinds.some((seenKind) => isEqual(seenKind, kind))) {
          seenKinds.push(kind);
          continue;
        }

        const entries = Array.from(kinds.entries());
        for (const [identifier, indexKind] of entries) {
          if (isEqual(indexKind, kind)) {
            await this.remove(identifier);
            kinds.delete(identifier);
          }
        }
      }
    }

    return kinds;
  }
}

const encodings = { keyEncoding: 'utf8', valueEncoding: 'json' };

const indexCodec = {
  encode: async (index: Index): Promise<IndexData> => {
    return {
      index: await index.serialize(),
      kind: index.kind,
      version: CODEC_VERSION,
    };
  },
  decode: async (identifier: string, data: IndexData): Promise<Index> => {
    invariant(data.version === CODEC_VERSION, `Index version ${data.version} is not supported`);
    const IndexConstructor = IndexConstructors[data.kind.kind];
    invariant(IndexConstructor, `Index kind ${data.kind.kind} is not supported`);
    return IndexConstructor.load({ serialized: data.index, indexKind: data.kind, identifier });
  },
};
