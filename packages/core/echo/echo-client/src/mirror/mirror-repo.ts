//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AnyDocumentId, type DocumentId } from '@automerge/automerge-repo';
import type * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { type Event } from '@dxos/async';
import { type Cursors, Op, Repo, Wire } from '@dxos/automerge-proxy';
import { Resource, type Context as ResourceContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService, type MirrorService } from '@dxos/protocols/rpc';

import {
  type ClientDocHandle,
  type ClientRepo,
  type EditsRejectedEvent,
  type SaveStateChangedEvent,
} from '../automerge/client-handle.ts';
import { type DocHandleProxy } from '../automerge/doc-handle-proxy.ts';
import { toDocumentId } from '../automerge/document-id.ts';
import { RepoProxy } from '../automerge/repo-proxy.ts';
import { EditsRejectedError, RepoClosedError } from '../errors.ts';
import { MirrorDocHandle, type ReplicaSource } from './mirror-doc-handle.ts';
import { isMirrorIndexedReads } from './mode.ts';

/** Builds the RawStrings the wire tags, since the proxy package does not run Automerge. */
const WIRE: Wire.DecodeOptions = { rawString: (text) => new A.RawString(text) };

const RPC_TIMEOUT = 30_000;

type Services = { mirrorService: MirrorService.Client; dataService: DataService.Client };

/**
 * A repo whose documents are proxies served by the worker's `MirrorService`: the tab loads no
 * Automerge. `@dxos/automerge-proxy`'s repo does the syncing; this adds ECHO's services and errors,
 * reads from the index, and Automerge replicas for code that needs them.
 */
export class MirrorRepo extends Resource implements ClientRepo {
  readonly #services: Services;
  // Documents of different types share the repo; `find<T>` is where a caller names the type.
  readonly #repo: Repo.ProxyRepo<DocumentId, MirrorDocHandle<any>>;
  /** Real Automerge replicas of documents handed to Automerge libraries, created on first use. */
  #replicas?: RepoProxy = undefined;
  /** The opening of {@link #replicas}, which every {@link replica} call made meanwhile waits on. */
  #replicasOpening?: Promise<RepoProxy> = undefined;
  /** How each handle opens a replica of its document for {@link MirrorDocHandle.leaseReplica}. */
  readonly #replicaSource: ReplicaSource = {
    open: <T>(documentId: DocumentId) => this.replica<T>(documentId),
    close: (documentId) => {
      this.releaseReplica(documentId);
    },
  };

  constructor(
    mirrorService: MirrorService.Client,
    dataService: DataService.Client,
    private readonly _runtime: Context.Context<never>,
    private readonly _spaceId: SpaceId,
  ) {
    super();
    this.#services = { mirrorService, dataService };
    this.#repo = new Repo.ProxyRepo({
      host: this.#createHost(),
      createHandle: (options) => new MirrorDocHandle({ ...options, replicas: this.#replicaSource }),
      errors: {
        closed: (documentId) => new RepoClosedError({ spaceId: this._spaceId, documentId }),
        refused: (documentId, changes) => new EditsRejectedError({ documentId, changes }),
      },
    });
  }

  get handles(): Record<string, ClientDocHandle<unknown>> {
    return this.#repo.handles;
  }

  get saveStateChanged(): Event<SaveStateChangedEvent> {
    return this.#repo.saveStateChanged;
  }

  /** Edits the worker refused; each one is also logged, and fails a flush waiting for it. */
  get editsRejected(): Event<EditsRejectedEvent> {
    return this.#repo.editsRejected;
  }

  find<T>(id: AnyDocumentId): ClientDocHandle<T> {
    return this.#find(id, false);
  }

  /**
   * Finds a document of objects, read from the worker's index while the tab only shows it: the
   * worker loads its Automerge copy only once the tab writes. Not for the space root, whose links the
   * index does not hold.
   */
  findIndexed<T>(id: AnyDocumentId): ClientDocHandle<T> {
    return this.#find(id, isMirrorIndexedReads());
  }

  create<T>(initialValue?: T): ClientDocHandle<T> {
    this.#requireOpen();
    return this.#repo.create(initialValue);
  }

  /** Cursors over the text at `path` in a document this repo follows. */
  cursors(documentId: DocumentId, path: readonly (string | number)[]): Cursors.Tracker {
    return this.#repo.cursors(documentId, path);
  }

  /**
   * A genuine Automerge replica of one document, for code written against the Automerge API:
   * ecosystem libraries and tooling that need history, op-id cursors or rich text. It syncs
   * through the worker's byte protocol like any replica client, so the mirror of the same document
   * converges with it one round trip later. A tab without such code loads no Automerge at all; in a
   * browser the first call would load the wasm.
   */
  async replica<T>(documentId: DocumentId): Promise<DocHandleProxy<T>> {
    this.#replicasOpening ??= this.#openReplicas();
    const replicas = await this.#replicasOpening;
    const handle = replicas.find<T>(documentId);
    await handle.whenReady();
    return handle;
  }

  /** Drops a replica once nothing uses it; the document stays mirrored. */
  releaseReplica(documentId: DocumentId): boolean {
    return this.#replicas?.release(documentId) ?? false;
  }

  import<T>(): ClientDocHandle<T> {
    throw new Error('Importing a binary document needs a worker RPC; not implemented in the mirror spike');
  }

  release(documentId: DocumentId): boolean {
    return this.#repo.release(documentId);
  }

  /**
   * Resolves once every edit made before the call is confirmed and its heads are in this tab, so heads
   * read afterwards include the caller's writes.
   */
  async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {
    await this.#repo.flushCreations();
    await this.#replicas?.flush();
    await this.#repo.flush({ storage: disk });
  }

  /**
   * Waits until every pending creation has reached the worker, requesting again the ones it did not
   * take. Throws if one still cannot be created.
   */
  async flushCreations(): Promise<void> {
    await this.#repo.flushCreations();
  }

  /**
   * Resolves once this tab holds every change the worker's copy of the document has now. The worker
   * absorbs and saves before it answers a resubscription, so the answer is the barrier.
   */
  async catchUp(documentId: DocumentId): Promise<void> {
    await this.#repo.catchUp(documentId);
  }

  protected override async _open(ctx: ResourceContext): Promise<void> {
    await this.#repo.open(ctx);
  }

  protected override async _close(): Promise<void> {
    const replicas = this.#replicasOpening;
    this.#replicas = undefined;
    this.#replicasOpening = undefined;
    // One still opening is closed once it has opened.
    await (await replicas?.catch(() => undefined))?.close();
    await this.#repo.close();
  }

  _updateServices({
    dataService,
    mirrorService,
  }: {
    dataService: DataService.Client;
    mirrorService?: MirrorService.Client;
  }): void {
    this.#services.dataService = dataService;
    if (mirrorService) {
      this.#services.mirrorService = mirrorService;
    }
    this.#replicas?._updateServices({ dataService });
  }

  /** Resubscribes every document with what this tab holds, so a new worker sends only what it missed. */
  async _onReconnect(): Promise<void> {
    await this.#repo.reconnect();
    await this.#replicas?._onReconnect();
  }

  #find<T>(id: AnyDocumentId, followCopy: boolean): ClientDocHandle<T> {
    if (typeof id !== 'string') {
      throw new TypeError(`Invalid documentId ${id}`);
    }
    const documentId = toDocumentId(id);
    const existing = this.#repo.handles[documentId];
    if (existing) {
      return existing;
    }
    this.#requireOpen(documentId);
    return this.#repo.find(documentId, { followCopy });
  }

  /** The proxy repo opens a step before this one and closes a step after, so this lifecycle decides. */
  #requireOpen(documentId?: DocumentId): void {
    if (!this.isOpen) {
      throw new RepoClosedError({ spaceId: this._spaceId, documentId });
    }
  }

  async #openReplicas(): Promise<RepoProxy> {
    const replicas = new RepoProxy(this.#services.dataService, this._runtime, this._spaceId);
    this.#replicas = replicas;
    try {
      await replicas.open();
      return replicas;
    } catch (err) {
      if (this.#replicas === replicas) {
        this.#replicas = undefined;
        this.#replicasOpening = undefined;
      }
      throw err;
    }
  }

  /** The worker's `MirrorService` and `DataService` as the proxy repo's host, with values tagged for JSON. */
  #createHost(): Repo.Host<DocumentId> {
    const services = this.#services;
    const call = <A>(effect: Effect.Effect<A, unknown>) =>
      runServiceCall(this._runtime, effect, { timeout: RPC_TIMEOUT });
    return {
      subscribe: ({ subscriptionId, clientId }, { onEvents, onError, onClose }) =>
        subscribeStream(
          this._runtime,
          services.mirrorService['MirrorService.subscribe']({ subscriptionId, clientId, spaceId: this._spaceId }),
          {
            onData: ({ events }) => onEvents(events.map((event) => Wire.decodeEvent(event, WIRE))),
            onError,
            onClose,
          },
        ),
      updateSubscription: async (request) => {
        await call(services.mirrorService['MirrorService.updateSubscription'](request));
      },
      submit: async ({ subscriptionId, batches }) =>
        (
          await call(
            services.mirrorService['MirrorService.submit']({
              subscriptionId,
              batches: batches.map((batch) => ({ ...batch, changes: Wire.encodeChanges(batch.changes) })),
            }),
          )
        ).results,
      createDocument: async (initialValue) => {
        const { documentId } = await call(
          services.dataService['DataService.createDocument']({
            spaceId: this._spaceId,
            initialValue: toInitialValue(initialValue),
          }),
        );
        // The wire carries the id the worker minted as a plain string.
        return documentId as DocumentId;
      },
      flush: async (documentIds) => {
        await call(services.dataService['DataService.flush']({ documentIds }));
      },
      resolveCursors: async (request) =>
        (await call(services.mirrorService['MirrorService.resolveCursors'](request))).positions,
      createCursors: async (request) =>
        (await call(services.mirrorService['MirrorService.createCursors'](request))).cursors,
    };
  }
}

/** A document's initial value, which is a map at its root, as `DataService` takes it. */
const toInitialValue = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined) {
    return undefined;
  }
  invariant(Op.isContainer(value) && !Array.isArray(value), 'A document is a map at its root');
  return value;
};
