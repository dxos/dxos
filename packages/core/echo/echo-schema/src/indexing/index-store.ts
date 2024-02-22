//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';

import { IndexSchema } from './index-schema';
import { type IndexKind, type Index, type IndexStaticProps } from './types';
import { overrideFile } from './util';

export type IndexStoreParams = {
  directory: Directory;
};

export class IndexStore {
  private readonly _directory: Directory;
  constructor({ directory }: IndexStoreParams) {
    this._directory = directory;
  }

  async save(index: Index) {
    const filename = indexKindFilenameCodec.encode(index.kind);
    const file = this._directory.getOrCreateFile(filename);
    await overrideFile(file, Buffer.from(await index.serialize()));
  }

  async load(filename: string): Promise<Index> {
    const kind = indexKindFilenameCodec.decode(filename);
    const IndexConstructor = IndexConstructors[kind.kind];
    invariant(IndexConstructor, `Index constructor not found for kind: ${kind.kind}`);
    try {
      const file = this._directory.getOrCreateFile(filename);
      const { size } = await file.stat();
      if (size === 0) {
        return new IndexConstructor(kind);
      }
      const serialized = (await file.read(0, size)).toString();
      return IndexConstructor.load({ serialized, indexKind: kind });
    } catch (err) {
      log.warn(`Error loading index: ${filename}`, err);
      return new IndexConstructor(kind);
    }
  }
}

const IndexConstructors: { [key in IndexKind['kind']]?: IndexStaticProps } = {
  SCHEMA_MATCH: IndexSchema,
};

const indexKindFilenameCodec = {
  encode: (kind: IndexKind): string => {
    switch (kind.kind) {
      case 'SCHEMA_MATCH':
        return 'schema-match';
      default:
        throw new Error(`Unsupported index kind: ${kind}`);
    }
  },
  decode: (filename: string): IndexKind => {
    switch (filename) {
      case 'schema-match':
        return { kind: 'SCHEMA_MATCH' };
      default:
        throw new Error(`Unsupported index kind: ${filename}`);
    }
  },
};
