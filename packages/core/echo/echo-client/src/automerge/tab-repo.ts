//
// Copyright 2026 DXOS.org
//

import { type AnyDocumentId, type AutomergeUrl, type DocumentId } from '@automerge/automerge-repo';
import type * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { type Event } from '@dxos/async';
import * as A from '@dxos/automerge-proxy/Automerge';
import type * as Contract from '@dxos/automerge-proxy/Contract';
import * as Handle from '@dxos/automerge-proxy/Handle';
import * as Repo from '@dxos/automerge-proxy/Repo';
import * as Wire from '@dxos/automerge-proxy/Wire';
import { Resource, type Context as ResourceContext } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';
import { runServiceCall, subscribeStream } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';

import { DocumentUnavailableError, EditsRejectedError, RepoClosedError } from '../errors.ts';
import { stringifyAutomergeUrl } from './automerge-url.ts';
import {
  type ClientDocHandle,
  type ClientRepo,
  type DiskSettlement,
  type EditsRejectedEvent,
  type SaveStateChangedEvent,
} from './client-handle.ts';
import { toDocumentId } from './document-id.ts';

/** Builds the scalar strings a copy's tags name, with the namespace's class. */
const WIRE: Wire.DecodeOptions = { rawString: (text) => new A.RawString(text) };

const RPC_TIMEOUT = 30_000;

/** The handle the database layer loads in proxy mode: a tab document, with ECHO's handle interface. */
export class TabDocHandle<T> extends Handle.DocHandle<T, DocumentId> implements ClientDocHandle<T> {
  constructor(options: Omit<Handle.Options<T, DocumentId>, 'unavailableError'>) {
    super({ ...options, unavailableError: (documentId) => new DocumentUnavailableError({ documentId }) });
  }

  get url(): AutomergeUrl | undefined {
    return this.documentId ? stringifyAutomergeUrl(this.documentId) : undefined;
  }

  async whenSettledOnDisk(): Promise<DiskSettlement> {
    return this.whenStored();
  }

  update(): void {
    throw new Error('A tab document has no Automerge document to replace');
  }
}

export type TabClientRepoProps = {
  dataService: DataService.Client;
  runtime: Context.Context<never>;
  spaceId: SpaceId;
};

/**
 * A repo of tab documents served by the worker's `DataService`: the tab loads no Automerge.
 * `@dxos/automerge-proxy`'s repo does the syncing; this adds ECHO's services and errors.
 */
export class TabClientRepo extends Resource implements ClientRepo {
  readonly #runtime: Context.Context<never>;
  readonly #spaceId: SpaceId;
  #dataService: DataService.Client;
  // Documents of different types share the repo; `find<T>` is where a caller names the type.
  readonly #repo: Repo.TabRepo<DocumentId, TabDocHandle<any>>;

  constructor({ dataService, runtime, spaceId }: TabClientRepoProps) {
    super();
    this.#runtime = runtime;
    this.#spaceId = spaceId;
    this.#dataService = dataService;
    this.#repo = new Repo.TabRepo({
      host: this.#createHost(),
      createHandle: (options) => new TabDocHandle(options),
      errors: {
        closed: (documentId) => new RepoClosedError({ spaceId: this.#spaceId, documentId }),
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

  get editsRejected(): Event<EditsRejectedEvent> {
    return this.#repo.editsRejected;
  }

  find<T>(id: AnyDocumentId): ClientDocHandle<T> {
    if (typeof id !== 'string') {
      throw new TypeError(`Invalid documentId ${id}`);
    }
    const documentId = toDocumentId(id);
    const existing = this.#repo.handles[documentId];
    if (existing) {
      return existing;
    }
    this.#requireOpen(documentId);
    return this.#repo.find(documentId);
  }

  findIndexed<T>(id: AnyDocumentId): ClientDocHandle<T> {
    return this.find(id);
  }

  primeCopy(_documentId: string, _copy: Contract.Copy): void {}

  create<T>(initialValue?: T): ClientDocHandle<T> {
    this.#requireOpen();
    return this.#repo.create(initialValue);
  }

  import<T>(): ClientDocHandle<T> {
    throw new Error('Importing a binary document into a tab document repo is not supported');
  }

  release(documentId: DocumentId): boolean {
    return this.#repo.release(documentId);
  }

  /** Resolves once every change made before the call is saved by the worker. */
  async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {
    await this.#repo.flush({ storage: disk });
  }

  async flushCreations(): Promise<void> {
    await this.#repo.flushCreations();
  }

  protected override async _open(ctx: ResourceContext): Promise<void> {
    // Counted in the tab: the worker never sees the later changes a refusal takes back with it.
    this.#repo.editsRejected.on(ctx, ({ hashes }) =>
      trace.metrics.increment('dxos.echo.edits.rejected', hashes.length, { unit: '{change}' }),
    );
    await this.#repo.open(ctx);
  }

  protected override async _close(): Promise<void> {
    await this.#repo.close();
  }

  _updateServices({ dataService }: { dataService: DataService.Client }): void {
    this.#dataService = dataService;
  }

  /** Follows every document again with what this tab holds, so a new worker sends only what it lacks. */
  async _onReconnect(): Promise<void> {
    await this.#repo.reconnect();
  }

  /** The tab repo opens a step before this one and closes a step after, so this lifecycle decides. */
  #requireOpen(documentId?: DocumentId): void {
    if (!this.isOpen) {
      throw new RepoClosedError({ spaceId: this.#spaceId, documentId });
    }
  }

  /** The worker's `DataService` as the tab repo's host. */
  #createHost(): Repo.Host<DocumentId> {
    // Read at each call, so a call after a reconnect reaches the service the reconnect handed over.
    const service = () => this.#dataService;
    const call = <R>(effect: Effect.Effect<R, unknown>) =>
      runServiceCall(this.#runtime, effect, { timeout: RPC_TIMEOUT });
    return {
      subscribe: ({ subscriptionId, clientId }, { onEvents, onError, onClose }) =>
        subscribeStream(
          this.#runtime,
          service()['DataService.subscribeProxy']({ subscriptionId, clientId, spaceId: this.#spaceId }),
          {
            onData: ({ events }) => onEvents(events.map((event) => Wire.decodeEvent(event, WIRE))),
            onError,
            onClose,
          },
        ),
      updateSubscription: async (request) => {
        await call(service()['DataService.updateProxySubscription'](request));
      },
      submit: async (request) => (await call(service()['DataService.submit'](request))).results,
      createDocument: async (changes) => {
        const { documentId } = await call(
          service()['DataService.createDocument']({ spaceId: this.#spaceId, changes: [...changes] }),
        );
        // The wire carries the id the worker minted as a plain string.
        return documentId as DocumentId;
      },
      flush: async (documentIds) => {
        await call(service()['DataService.flush']({ documentIds }));
      },
    };
  }
}
