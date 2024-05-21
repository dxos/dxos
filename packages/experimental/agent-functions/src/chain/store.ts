//
// Copyright 2023 DXOS.org
//

import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { type Document } from 'langchain/document';
import { type Embeddings } from 'langchain/embeddings/base';
import { type VectorStore } from 'langchain/vectorstores/base';
import fs from 'node:fs';
import { join } from 'node:path';

import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

const metaKey = ({ space, id }: ChainDocument['metadata']) => `${space ?? ''}/${id}`;

const VERSION = '0.1';

const INDEX_FILE = 'dxos_index.json';

export type ChainDocument = Document & {
  metadata: {
    space?: string;
    id: string;
  };
};

export type ChainDocumentInfo = { id: string; hash: string };

export type ChainStoreOptions = {
  id?: string;
  baseDir?: string;
};

export class ChainStore {
  private _vectorStore?: FaissStore;
  private _documentById = new Map<string, ChainDocumentInfo>();
  private _documentByHash = new Map<string, string>();

  constructor(
    private readonly _embeddings: Embeddings,
    private readonly _options: ChainStoreOptions = {},
  ) {}

  get size() {
    return this._documentById.size;
  }

  get info() {
    return {
      version: VERSION,
      baseDir: this.baseDir,
      documents: this._documentById.size,
    };
  }

  get vectorStore(): VectorStore {
    invariant(this._vectorStore);
    return this._vectorStore;
  }

  get baseDir() {
    return this._options?.baseDir
      ? join(this._options.baseDir, [this._options.id, VERSION].filter(Boolean).join('_').replace(/\W/g, '_'))
      : undefined;
  }

  async initialize() {
    log('initializing...', this.info);
    try {
      if (this.baseDir && fs.existsSync(this.baseDir)) {
        this._vectorStore = await FaissStore.load(this.baseDir, this._embeddings);

        // Check version.
        const { version, index, hash } = JSON.parse(fs.readFileSync(join(this.baseDir, INDEX_FILE), 'utf8'));
        if (version !== VERSION) {
          throw new Error(`Invalid version (expected: ${VERSION}; got: ${version})`);
        }

        this._documentById = new Map(index);
        this._documentByHash = new Map(hash);
      }
    } catch (err: any) {
      log.error('Corrupt store', { baseDir: this.baseDir, version: VERSION, error: String(err) });
    }

    if (!this._vectorStore) {
      // TODO(burdon): Store isn't initialized properly unless adding at least one document?
      this._vectorStore = await FaissStore.fromDocuments(
        [
          {
            metadata: { space: 'dxos', id: '_' },
            pageContent: 'test', // Cannot be empty.
          },
        ],
        this._embeddings,
      );
    }

    log('initialized', this.info);
    return this;
  }

  async save() {
    invariant(this.baseDir);
    invariant(this._vectorStore);
    log('saving...', this.info);
    fs.mkdirSync(this.baseDir, { recursive: true });
    await this._vectorStore.save(this.baseDir);

    fs.writeFileSync(
      join(this.baseDir, INDEX_FILE),
      JSON.stringify({
        version: VERSION,
        index: Array.from(this._documentById.entries()),
        hash: Array.from(this._documentByHash.entries()),
      }),
    );

    return this;
  }

  async delete() {
    invariant(this.baseDir);
    log('deleting...', this.info);
    fs.rmSync(this.baseDir, { recursive: true, force: true });
    return this;
  }

  // TODO(burdon): Pass in hash?
  async hasDocument(doc: ChainDocument): Promise<boolean> {
    const hash = await subtleCrypto.digest('SHA-256', Buffer.from(doc.pageContent));
    return this._documentByHash.has(Buffer.from(hash).toString('hex'));
  }

  // TODO(burdon): Split into chunks?
  async addDocuments(docs: ChainDocument[]) {
    invariant(this._vectorStore);
    const documentIds = docs.map(({ metadata }) => this._documentById.get(metaKey(metadata))).filter(nonNullable);
    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds.map(({ id }) => id) });
    }

    {
      // TODO(burdon): Check hash first.
      const documentIds = await this._vectorStore.addDocuments(docs);

      // Update index.
      for (let i = 0; i < documentIds.length; ++i) {
        const digest = await subtleCrypto.digest('SHA-256', Buffer.from(docs[i].pageContent));
        const hash = Buffer.from(digest).toString('hex');
        this._documentById.set(metaKey(docs[i].metadata), { id: documentIds[i], hash });
        this._documentByHash.set(hash, documentIds[i]);
      }
    }
  }

  async deleteDocuments(metadata: ChainDocument['metadata'][]) {
    invariant(this._vectorStore);
    const documentIds = metadata
      .map((metadata) => {
        const id = metaKey(metadata);
        const documentId = this._documentById.get(id);
        if (documentId) {
          this._documentById.delete(id);
        }
        return documentId;
      })
      .filter(nonNullable);

    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds.map(({ id }) => id) });
    }
  }
}
