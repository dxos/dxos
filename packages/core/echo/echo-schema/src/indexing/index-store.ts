//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Directory } from '@dxos/random-access-storage';

import { IndexSchema } from './index-schema';
import { type IndexKind, type Index, type IndexStaticProps } from './types';
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

  async save({ index, filename }: { index: Index; filename: string }) {
    const file = this._directory.getOrCreateFile(filename);

    const serialized = Buffer.from(await index.serialize());
    const header = Buffer.from(JSON.stringify(headerEncoder.encode(index.kind)));

    const metadata = Buffer.alloc(RESERVED_SIZE);
    metadata.writeInt32LE(header.length, 0);
    const data = Buffer.concat([metadata, header, serialized]);

    await overrideFile(file, data);
  }

  async load(filename: string): Promise<Index> {
    const file = this._directory.getOrCreateFile(filename);
    const { size } = await file.stat();

    const headerSize = fromBytesInt32(await file.read(0, 4));
    const header: IndexHeader = JSON.parse((await file.read(RESERVED_SIZE, headerSize)).toString());
    invariant(header.version === HEADER_VERSION, `Index version ${header.version} is not supported`);

    const kind = headerEncoder.decode(header);
    const IndexConstructor = IndexConstructors[kind.kind];
    invariant(IndexConstructor, `Index kind ${kind.kind} is not supported`);

    const offset = RESERVED_SIZE + headerSize;
    const serialized = (await file.read(offset, size - offset)).toString();
    return IndexConstructor.load({ serialized, indexKind: kind });
  }
}

const IndexConstructors: { [key in IndexKind['kind']]?: IndexStaticProps } = {
  SCHEMA_MATCH: IndexSchema,
};

const headerEncoder = {
  encode: (kind: IndexKind): IndexHeader => {
    return {
      kind,
      version: HEADER_VERSION,
    };
  },
  decode: (header: IndexHeader): IndexKind => {
    return header.kind;
  },
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
