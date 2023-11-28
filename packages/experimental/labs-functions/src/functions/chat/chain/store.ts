//
// Copyright 2023 DXOS.org
//

import { type Document } from 'langchain/document';
import type { Embeddings } from 'langchain/embeddings/base';
import type { VectorStore } from 'langchain/vectorstores/base';
import { FaissStore } from 'langchain/vectorstores/faiss';
import fs from 'node:fs';
import { join } from 'node:path';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

// TODO(burdon): Factor out.
export const nonNullable = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined;

const metaKey = ({ space, id }: ChainDocument['metadata']) => `${space ?? ''}/${id}`;

const VERSION = '0.1';

const INDEX_FILE = 'dxos_index.json';

export type ChainDocument = Document & {
  metadata: {
    space?: string;
    id: string;
  };
};

export type DocumentInfo = { id: string; hash: ArrayBuffer };

export class VectorStoreImpl {
  private _vectorStore?: FaissStore;
  private _vectorIndex = new Map<string, DocumentInfo>();

  constructor(private readonly _embeddings: Embeddings, private readonly _baseDir?: string) {}

  get size() {
    return this._vectorIndex.size;
  }

  get stats() {
    return {
      version: VERSION,
      documents: this._vectorIndex.size,
    };
  }

  get vectorStore(): VectorStore {
    invariant(this._vectorStore);
    return this._vectorStore;
  }

  async initialize() {
    try {
      if (this._baseDir) {
        this._vectorStore = await FaissStore.load(this._baseDir, this._embeddings);

        // Check version.
        const { version, index } = JSON.parse(fs.readFileSync(join(this._baseDir, INDEX_FILE), 'utf8'));
        if (version !== VERSION) {
          throw new Error(`Invalid version (expected: ${VERSION}; got: ${version})`);
        }

        this._vectorIndex = new Map(index);
      }
    } catch (err: any) {
      log.error('Corrupt store', String(err));
    }

    if (!this._vectorStore) {
      this._vectorStore = await FaissStore.fromDocuments([], this._embeddings);
    }

    return this;
  }

  async save() {
    invariant(this._baseDir);
    invariant(this._vectorStore);
    await this._vectorStore.save(this._baseDir);

    const data = JSON.stringify({ version: VERSION, index: Array.from(this._vectorIndex.entries()) });
    fs.writeFileSync(join(this._baseDir, INDEX_FILE), data);
    return this;
  }

  async delete() {
    invariant(this._baseDir);
    fs.rmSync(this._baseDir, { recursive: true, force: true });
    return this;
  }

  // TODO(burdon): Split into chunks?
  async addDocuments(docs: ChainDocument[]) {
    invariant(this._vectorStore);
    const documentIds = docs.map(({ metadata }) => this._vectorIndex.get(metaKey(metadata))).filter(nonNullable);
    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds.map(({ id }) => id) });
    }

    {
      const documentIds = await this._vectorStore.addDocuments(docs);
      for (let i = 0; i < documentIds.length; ++i) {
        const hash = await subtleCrypto.digest('SHA-256', Buffer.from(docs[i].pageContent));
        this._vectorIndex.set(metaKey(docs[i].metadata), { id: documentIds[i], hash });
      }
    }
  }

  async deleteDocuments(meta: ChainDocument['metadata'][]) {
    invariant(this._vectorStore);
    const documentIds = meta
      .map((metadata) => {
        const id = metaKey(metadata);
        const documentId = this._vectorIndex.get(id);
        if (documentId) {
          this._vectorIndex.delete(id);
        }
        return documentId;
      })
      .filter(nonNullable);

    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds.map(({ id }) => id) });
    }
  }
}
