//
// Copyright 2025 DXOS.org
//

import * as A from '@automerge/automerge';
import { type DocumentId, type PeerId, Repo } from '@automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb';

import { createLevel } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { FIND_PARAMS, LevelDBStorageAdapter } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { trace } from '@dxos/tracing';
import { range } from '@dxos/util';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

export type StorageAdaptorKind = 'idb' | 'node' | 'leveldb';

export type RunResults = {
  saveDuration: number;
  loadDuration: number;
  sanityDuration: number;
};

export type DocumentsResult = {
  docsCount: number;
  /**
   * [ms]
   */
  duration: number;
  docsCreated: Record<DocumentId, { mutations?: number; length: number }>;
};

type DocStruct = {
  text: string;
};

@trace.resource()
export class AutomergeReplicant {
  private _repoCtx = new Context();
  private _repo: Repo | undefined = undefined;

  constructor(private readonly env: ReplicantEnv) {}

  @trace.span()
  async openRepo({ storageAdaptor }: { storageAdaptor: StorageAdaptorKind }): Promise<void> {
    await this._repoCtx.dispose();
    this._repoCtx = new Context();
    const storage = await this._createStorage(this._repoCtx, storageAdaptor);
    this._repo = new Repo({ storage, peerId: this.env.params.replicantId as PeerId });
    this._repoCtx.onDispose(() => this._repo?.shutdown());
  }

  @trace.span()
  async closeRepo(): Promise<void> {
    await this._repoCtx.dispose();
    this._repoCtx = new Context();
    this._repo = undefined;
  }

  @trace.span()
  async createDocument({
    docsCount,
    mutationAmount,
    mutationSize,
    maximumDocSize,
  }: {
    docsCount: number;
    mutationAmount: number;
    /**
     * Mutation size in [bytes]
     */
    mutationSize: number;
    /**
     * Maximum size of text in [bytes]
     */
    maximumDocSize: number;
  }): Promise<DocumentsResult> {
    performance.mark('create:begin');
    const handles = range(docsCount).map(() =>
      this._repo!.create<DocStruct>({ text: faker.string.hexadecimal({ length: mutationSize }) }),
    );
    const docsCreated: DocumentsResult['docsCreated'] = {};
    for (const handle of handles) {
      for (let i = 0; i < mutationAmount; i++) {
        handle.change((doc) => {
          const mutation = faker.string.hexadecimal({ length: mutationSize });
          let newText: string;
          if (doc.text.length < maximumDocSize) {
            newText = doc.text + mutation;
          } else {
            newText = doc.text.slice(0, maximumDocSize - mutation.length) + mutation;
          }
          A.updateText(doc, ['text'], newText);
        });
      }
      docsCreated[handle.documentId] = { mutations: mutationAmount, length: handle.doc().text.length };
    }
    await this._repo!.flush();
    performance.mark('create:end');
    return {
      docsCount,
      duration: performance.measure('create', 'create:begin', 'create:end').duration,
      docsCreated,
    };
  }

  @trace.span()
  async loadDocuments({ docIds }: { docIds: DocumentId[] }): Promise<DocumentsResult> {
    performance.mark('load:begin');
    const docsLoaded: DocumentsResult['docsCreated'] = {};
    await Promise.all(
      docIds.map(async (id) => {
        try {
          const handle = await this._repo!.find<DocStruct>(id, FIND_PARAMS);
          await handle.whenReady();
          docsLoaded[id] = { length: handle.doc().text.length };
          return handle;
        } catch (error) {
          log.error('error loading document', { error });
        }
      }),
    );
    performance.mark('load:end');
    return {
      docsCount: docIds.length,
      duration: performance.measure('load', 'load:begin', 'load:end').duration,
      docsCreated: docsLoaded,
    };
  }

  private async _createStorage(
    ctx: Context,
    kind: StorageAdaptorKind,
  ): Promise<IndexedDBStorageAdapter | LevelDBStorageAdapter> {
    switch (kind) {
      case 'idb':
        return new IndexedDBStorageAdapter();
      case 'leveldb': {
        const level = await createLevel({ persistent: true, dataRoot: `/tmp/dxos/${this.env.params.testId}` });
        ctx.onDispose(() => level.close());
        const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
        await adapter.open();
        ctx.onDispose(() => adapter.close());
        return adapter;
      }
      default: {
        throw new Error(`Unsupported storage kind: ${kind}`);
      }
    }
  }
}

ReplicantRegistry.instance.register(AutomergeReplicant);
