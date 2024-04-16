//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { type MySublevel } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { type IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';

import { IndexConstructors } from './index-constructors';
import { type Index } from './types';

const RESERVED_SIZE = 4; // 4 bytes
const HEADER_VERSION = 1;

type IndexHeader = {
  kind: IndexKind;
  version: number;
};

export type IndexStoreParams = {
  db: MySublevel;
};

export class IndexStore {
  private readonly _db: MySublevel;
  constructor({ db }: IndexStoreParams) {
    this._db = db;
  }

  async save(index: Index) {
    const serialized = Buffer.from(await index.serialize());
    const header = Buffer.from(JSON.stringify(headerCodec.encode(index.kind)));

    const metadata = Buffer.alloc(RESERVED_SIZE);
    metadata.writeInt32LE(header.length, 0);
    const data = Buffer.concat([metadata, header, serialized]);

    await this._db.put<string, Buffer>(index.identifier, data, encodings);
  }

  async load(identifier: string): Promise<Index> {
    const data = await this._db.get<string, Buffer>(identifier, encodings);
    const size = data.length;

    const { header, headerSize } = await getHeader(data);

    const kind = headerCodec.decode(header);
    const IndexConstructor = IndexConstructors[kind.kind];
    invariant(IndexConstructor, `Index kind ${kind.kind} is not supported`);

    const offset = RESERVED_SIZE + headerSize;
    invariant(size > offset, `Index file ${identifier} is too small`);

    const serialized = data.subarray(offset).toString();
    return IndexConstructor.load({ serialized, indexKind: kind, identifier });
  }

  async remove(identifier: string) {
    await this._db.del(identifier, encodings);
  }

  /**
   *
   * @returns Map of index identifiers vs their kinds.
   */
  async loadIndexKindsFromDisk(): Promise<Map<string, IndexKind>> {
    const headers = new Map<string, IndexKind>();

    for await (const [identifier, data] of this._db.iterator<string, Buffer>({
      keyEncoding: 'utf8',
      valueEncoding: 'buffer',
    })) {
      const header = getHeader(data);
      if (header) {
        headers.set(identifier, headerCodec.decode(header.header));
      }
    }

    // Delete all indexes that are colliding with the same kind.
    {
      const seenKinds: IndexKind[] = [];
      const allKinds = Array.from(headers.values());
      for (const kind of allKinds) {
        if (!seenKinds.some((seenKind) => isEqual(seenKind, kind))) {
          seenKinds.push(kind);
          continue;
        }

        const entries = Array.from(headers.entries());
        for (const [identifier, indexKind] of entries) {
          if (isEqual(indexKind, kind)) {
            await this.remove(identifier);
            headers.delete(identifier);
          }
        }
      }
    }

    return headers;
  }
}

const encodings = { keyEncoding: 'utf8', valueEncoding: 'buffer' };

const headerCodec = {
  encode: (kind: IndexKind): IndexHeader => {
    return {
      kind,
      version: HEADER_VERSION,
    };
  },
  decode: (header: IndexHeader): IndexKind => {
    invariant(header.version === HEADER_VERSION, `Index version ${header.version} is not supported`);
    return header.kind;
  },
};

const getHeader = (data: Buffer): { header: IndexHeader; headerSize: number } => {
  invariant(data.length > RESERVED_SIZE, 'Index file is too small');

  const headerSize = fromBytesInt32(data.subarray(0, RESERVED_SIZE));
  invariant(data.length > RESERVED_SIZE + headerSize, 'Index file is too small');

  return { header: JSON.parse(data.subarray(RESERVED_SIZE, RESERVED_SIZE + headerSize).toString()), headerSize };
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
