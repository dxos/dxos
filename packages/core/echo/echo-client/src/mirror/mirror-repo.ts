//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';
import type * as Context from 'effect/Context';

import { Event, Trigger, UpdateScheduler, asyncTimeout } from '@dxos/async';
import { Resource } from '@dxos/context';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService, type MirrorService } from '@dxos/protocols/rpc';

import { type ClientDocHandle, type ClientRepo, type SaveStateChangedEvent } from '../automerge/client-handle.ts';
import { toDocumentId } from '../automerge/document-id.ts';
import { RepoClosedError } from '../errors.ts';
import { MirrorCursors } from './mirror-cursors.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';

const RPC_TIMEOUT = 30_000;
const FLUSH_TIMEOUT = 30_000;
const MAX_SUBMIT_FREQ = 20; // [batches/sec]

/**
 * A repo whose documents are JSON mirrors served by the worker's `MirrorService`: the tab loads no
 * Automerge. Local edits become op batches, one in flight per document; the worker's entries bring
 * other writers' changes and acknowledge this tab's.
 */
export class MirrorRepo extends Resource implements ClientRepo {
  /** Random per tab session; tags this tab's batches in the worker's log and in change messages. */
  readonly #clientId = PublicKey.random().toHex();
  readonly #subscriptionId = PublicKey.random().toHex();
  // Documents of different types share the map; `find<T>` is where a caller names the type.
  readonly #handles: Record<string, MirrorDocHandle<any>> = {};
  readonly #pendingCreations = new Map<string, Promise<void>>();
  readonly #pendingAdd = new Map<DocumentId, MirrorService.Known | undefined>();
  readonly #pendingRemove = new Set<DocumentId>();
  #subscriptionReady = new Trigger();
  /** Batches whose submit failed, resent as they were: the worker ignores one it already applied. */
  readonly #retry = new Map<DocumentId, MirrorService.SubmitRequest['batches'][number]>();
  /** Submit failures, so a flush can tell that writes it waits for may never land. */
  readonly #failed = new Event<Error>();
  /** Any handle confirming something, which is when a flush re-checks what is still pending. */
  readonly #progress = new Event<void>();
  #unsubscribe?: () => void = undefined;
  #submitJob?: UpdateScheduler = undefined;

  readonly saveStateChanged = new Event<SaveStateChangedEvent>();

  constructor(
    private readonly _mirrorService: MirrorService.Client,
    private _dataService: DataService.Client,
    private readonly _runtime: Context.Context<never>,
    private readonly _spaceId: SpaceId,
  ) {
    super();
  }

  get handles(): Record<string, ClientDocHandle<unknown>> {
    return this.#handles;
  }

  find<T>(id: AnyDocumentId): ClientDocHandle<T> {
    if (typeof id !== 'string') {
      throw new TypeError(`Invalid documentId ${id}`);
    }
    const documentId = toDocumentId(id);
    const existing = this.#handles[documentId];
    if (existing) {
      return existing;
    }
    this.#requireOpen(documentId);
    const handle = this.#createHandle<T>({ documentId });
    this.#handles[documentId] = handle;
    this.#pendingRemove.delete(documentId);
    this.#pendingAdd.set(documentId, undefined);
    this.#submitJob?.trigger();
    return handle;
  }

  create<T>(initialValue?: T): ClientDocHandle<T> {
    this.#requireOpen();
    const handle = this.#createHandle<T>({ initialValue });
    const creation = runServiceCall(
      this._runtime,
      this._dataService['DataService.createDocument']({
        spaceId: this._spaceId,
        // A doc's declared type is an interface without an index signature; the value is a plain JSON object.
        initialValue: initialValue as Record<string, unknown>,
      }),
      { timeout: RPC_TIMEOUT },
    )
      .then(({ documentId }) => {
        const id = documentId as DocumentId;
        handle._setDocumentId(id);
        this.#handles[id] = handle;
        this.#pendingAdd.set(id, undefined);
        this.#submitJob?.trigger();
      })
      .catch((err) => {
        log.catch(err);
        handle._failReady(err);
      })
      .finally(() => this.#pendingCreations.delete(handle._internalId));
    this.#pendingCreations.set(handle._internalId, creation);
    return handle;
  }

  /** Cursors over the text at `path` in a document this repo follows. */
  cursors(documentId: DocumentId, path: readonly (string | number)[]): MirrorCursors {
    const handle = this.#handles[documentId];
    if (!handle) {
      throw new Error(`Document ${documentId} is not loaded`);
    }
    const request = { documentId, path: [...path] };
    return new MirrorCursors(handle, path, {
      resolve: async (heads, cursors) =>
        (
          await runServiceCall(
            this._runtime,
            this._mirrorService['MirrorService.resolveCursors']({ ...request, heads, cursors }),
            { timeout: RPC_TIMEOUT },
          )
        ).positions,
      create: async (heads, positions) =>
        (
          await runServiceCall(
            this._runtime,
            this._mirrorService['MirrorService.createCursors']({ ...request, heads, positions }),
            { timeout: RPC_TIMEOUT },
          )
        ).cursors,
    });
  }

  import<T>(): ClientDocHandle<T> {
    throw new Error('Importing a binary document needs a worker RPC; not implemented in the mirror spike');
  }

  release(documentId: DocumentId): boolean {
    const handle = this.#handles[documentId];
    if (!handle || handle.hasPending) {
      return false;
    }
    handle.removeAllListeners();
    delete this.#handles[documentId];
    this.#pendingAdd.delete(documentId);
    this.#pendingRemove.add(documentId);
    this.#submitJob?.trigger();
    return true;
  }

  /**
   * Resolves once every edit made before the call is confirmed and its heads are in this tab, so heads
   * read afterwards include the caller's writes.
   */
  async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {
    await this.flushCreations();
    await asyncTimeout(this.#drain(), FLUSH_TIMEOUT);
    if (disk) {
      const documentIds = Object.values(this.#handles)
        .map((handle) => handle.documentId)
        .filter((documentId): documentId is DocumentId => documentId !== undefined);
      await runServiceCall(this._runtime, this._dataService['DataService.flush']({ documentIds }), {
        timeout: RPC_TIMEOUT,
      });
    }
  }

  async flushCreations(): Promise<void> {
    await Promise.all(this.#pendingCreations.values());
  }

  protected override async _open(): Promise<void> {
    this.#submitJob = new UpdateScheduler(this._ctx, () => this.#sync(), { maxFrequency: MAX_SUBMIT_FREQ });
    this.#subscribe();
  }

  protected override async _close(): Promise<void> {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    await this.#submitJob?.join();
    this.#submitJob = undefined;
  }

  _updateDataService(dataService: DataService.Client): void {
    this._dataService = dataService;
  }

  /** Resubscribes every document with what this tab holds, so a new worker sends only what it missed. */
  async _onReconnect(): Promise<void> {
    this.#unsubscribe?.();
    this.#subscriptionReady = new Trigger();
    for (const [documentId, handle] of Object.entries(this.#handles)) {
      this.#pendingAdd.set(documentId as DocumentId, handle._known());
    }
    this.#subscribe();
    this.#submitJob?.trigger();
  }

  #requireOpen(documentId?: DocumentId): void {
    if (!this.isOpen || !this.#submitJob) {
      throw new RepoClosedError({ spaceId: this._spaceId, documentId });
    }
  }

  #createHandle<T>(options: { documentId?: DocumentId; initialValue?: T }): MirrorDocHandle<T> {
    const handle: MirrorDocHandle<T> = new MirrorDocHandle<T>({
      ...options,
      clientId: this.#clientId,
      onDelete: () => {
        if (handle.documentId) {
          delete this.#handles[handle.documentId];
          this.#pendingAdd.delete(handle.documentId);
          this.#pendingRemove.add(handle.documentId);
          this.#submitJob?.trigger();
        }
      },
    });
    handle.on('change', ({ patchInfo }) => {
      if (patchInfo.source === 'change') {
        this.#submitJob?.trigger();
        this.#emitSaveState();
      }
    });
    handle.confirmed.on(() => {
      // One batch per document is in flight; the next can go once this one is confirmed.
      this.#submitJob?.trigger();
      this.#emitSaveState();
      this.#progress.emit();
    });
    return handle;
  }

  #subscribe(): void {
    const stream = this._mirrorService['MirrorService.subscribe']({
      subscriptionId: this.#subscriptionId,
      clientId: this.#clientId,
      spaceId: this._spaceId,
    });
    this.#unsubscribe = subscribeStream(this._runtime, stream, {
      onData: ({ events }) => {
        this.#subscriptionReady.wake();
        for (const event of events) {
          this.#handles[event.documentId]?._receive(event);
        }
      },
      onError: (err) => {
        if (this.isOpen) {
          log.warn('mirror subscription dropped', { err });
        }
      },
    });
  }

  /** Sends subscription changes and one batch per document with buffered edits. */
  async #sync(): Promise<void> {
    await this.#subscriptionReady.wait({ timeout: RPC_TIMEOUT });
    if (this.#pendingAdd.size > 0 || this.#pendingRemove.size > 0) {
      const add = [...this.#pendingAdd].map(([documentId, known]) => ({ documentId, ...(known ? { known } : {}) }));
      const remove = [...this.#pendingRemove];
      this.#pendingAdd.clear();
      this.#pendingRemove.clear();
      await runServiceCall(
        this._runtime,
        this._mirrorService['MirrorService.updateSubscription']({ subscriptionId: this.#subscriptionId, add, remove }),
        { timeout: RPC_TIMEOUT },
      );
    }

    const batches: MirrorService.SubmitRequest['batches'] = [...this.#retry.values()];
    this.#retry.clear();
    for (const handle of Object.values(this.#handles)) {
      const next = handle.documentId ? handle._takeBatch() : undefined;
      if (handle.documentId && next) {
        batches.push({
          documentId: handle.documentId,
          epoch: next.epoch,
          batchId: next.batch.batchId,
          baseVersion: next.batch.baseVersion,
          ops: [...next.batch.ops],
        });
      }
    }
    if (batches.length === 0) {
      return;
    }
    let results: MirrorService.SubmitResponse['results'];
    try {
      ({ results } = await runServiceCall(
        this._runtime,
        this._mirrorService['MirrorService.submit']({ subscriptionId: this.#subscriptionId, batches }),
        { timeout: RPC_TIMEOUT },
      ));
    } catch (err) {
      for (const batch of batches) {
        this.#retry.set(batch.documentId as DocumentId, batch);
      }
      this.#failed.emit(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    for (const { documentId, status } of results) {
      if (status !== 'applied') {
        // The worker restarted or trimmed the history this batch was based on: catch up from our heads.
        const handle = this.#handles[documentId];
        this.#pendingAdd.set(documentId as DocumentId, handle?._known());
        this.#submitJob?.trigger();
      }
    }
  }

  /** Waits until no handle has an unconfirmed edit; rejects if a submit fails meanwhile. */
  async #drain(): Promise<void> {
    for (;;) {
      const waiting = Object.values(this.#handles).filter(
        (handle) => (handle.hasPending || !handle.isReady()) && handle.documentId && handle.state !== 'unavailable',
      );
      if (waiting.length === 0) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          offProgress();
          offFailure();
        };
        const offProgress = this.#progress.on(() => {
          cleanup();
          resolve();
        });
        const offFailure = this.#failed.on((err) => {
          cleanup();
          reject(err);
        });
        this.#submitJob?.trigger();
      });
    }
  }

  #emitSaveState(): void {
    const unsavedDocuments = Object.values(this.#handles)
      .filter((handle) => handle.hasPending && handle.documentId)
      .map((handle) => handle.documentId)
      .filter((documentId): documentId is DocumentId => documentId !== undefined);
    this.saveStateChanged.emit({ unsavedDocuments });
  }
}
