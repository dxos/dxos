//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { invariant } from '@dxos/invariant';
import { type IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { type File, type Directory } from '@dxos/random-access-storage';

import { IndexConstructors } from './index-constructors';
import { type Index } from './types';
import { overrideFile } from './util';

const RESERVED_SIZE = 4; // 4 bytes
const HEADER_VERSION = 1;

type IndexHeader = {
  kind: IndexKind;
  version: number;
};

export type IndexStoreParams = {
  directory: Directory;
};

export class IndexStore {
  private readonly _directory: Directory;
  constructor({ directory }: IndexStoreParams) {
    this._directory = directory;
  }

  async save(index: Index) {
    const serialized = Buffer.from(await index.serialize());
    const header = Buffer.from(JSON.stringify(headerCodec.encode(index.kind)));

    const metadata = Buffer.alloc(RESERVED_SIZE);
    metadata.writeInt32LE(header.length, 0);
    const data = Buffer.concat([metadata, header, serialized]);

    await overrideFile({ path: index.identifier, directory: this._directory, content: data });
  }

  async load(identifier: string): Promise<Index> {
    const file = this._directory.getOrCreateFile(identifier);
    const { size } = await file.stat();

    const { header, headerSize } = await getHeader(file);

    const kind = headerCodec.decode(header);
    const IndexConstructor = IndexConstructors[kind.kind];
    invariant(IndexConstructor, `Index kind ${kind.kind} is not supported`);

    const offset = RESERVED_SIZE + headerSize;
    invariant(size > offset, `Index file ${identifier} is too small`);

    const serialized = (await file.read(offset, size - offset)).toString();
    return IndexConstructor.load({ serialized, indexKind: kind, identifier });
  }

  async remove(identifier: string) {
    const file = this._directory.getOrCreateFile(identifier);
    await file.destroy();
  }

  /**
   *
   * @returns Map of index identifiers vs their kinds.
   */
  async loadIndexKindsFromDisk(): Promise<Map<string, IndexKind>> {
    const identifiers = await this._directory.list();
    const headers = new Map<string, IndexKind>();

    await Promise.all(
      identifiers.map(async (identifier) => {
        const file = this._directory.getOrCreateFile(identifier);
        const header = await getHeader(file).catch(() => {});
        if (header) {
          headers.set(identifier, headerCodec.decode(header.header));
        }
      }),
    );

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

const getHeader = async (file: File): Promise<{ header: IndexHeader; headerSize: number }> => {
  const { size } = await file.stat();

  invariant(size > RESERVED_SIZE, 'Index file is too small');

  const headerSize = fromBytesInt32(await file.read(0, 4));
  invariant(size > RESERVED_SIZE + headerSize, 'Index file is too small');

  return { header: JSON.parse((await file.read(RESERVED_SIZE, headerSize)).toString()), headerSize };
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
