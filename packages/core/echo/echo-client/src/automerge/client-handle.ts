//
// Copyright 2026 DXOS.org
//

import type { Doc as AutomergeDoc, ChangeFn, ChangeOptions, Heads, Patch } from '@automerge/automerge';
import { type AnyDocumentId, type AutomergeUrl, type DocumentId } from '@automerge/automerge-repo';
import type { EventEmitter } from 'eventemitter3';

import type { Event } from '@dxos/async';
import type * as Contract from '@dxos/automerge-proxy/Contract';
import type { Context } from '@dxos/context';
import type { DataService } from '@dxos/protocols/rpc';

import type * as Doc from './Doc.ts';

//
// What the database layer needs from a client-side document handle and repo, so it can run on an
// Automerge replica (`RepoProxy`) or a tab document (`TabClientRepo`) without knowing which.
//

export type ChangeEvent<T> = {
  handle: ClientDocHandle<T>;
  doc: AutomergeDoc<T>;
  patches: Patch[];
  /**
   * `change` is a change made on this thread; `host` is a change the worker delivered on its own;
   * `bulk` is part of a large delivery, such as a first sync.
   */
  patchInfo: { before: AutomergeDoc<T>; after: AutomergeDoc<T>; source: 'change' | 'host' | 'bulk' };
};

export type ClientDocHandleEvents<T> = {
  change: ChangeEvent<T>;
  delete: { handle: ClientDocHandle<T> };
  /** The handle left `'unavailable'` because the document finally arrived. */
  available: { handle: ClientDocHandle<T> };
};

/**
 * Lifecycle of a client handle: `'pending'` until the worker reports its disk probe, `'requesting'`
 * while it fetches from the network, `'ready'` once the document is usable, and `'unavailable'` when
 * the host cannot produce it.
 */
export type DocHandleProxyState = 'pending' | 'requesting' | 'ready' | 'unavailable';

/** `true` when the document was on the worker's disk, `false` when it is being fetched. */
export type DiskSettlement = boolean;

/** A {@link Doc.Handle} the database layer can load, subscribe to and release. */
export interface ClientDocHandle<T> extends EventEmitter<ClientDocHandleEvents<T>> {
  doc(): AutomergeDoc<T>;
  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void;
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined;
  readonly url: AutomergeUrl | undefined;
  readonly documentId: DocumentId | undefined;
  readonly state: DocHandleProxyState;
  /** @internal */
  readonly _internalId: string;
  whenReady(): Promise<void>;
  isReady(): boolean;
  whenSettledOnDisk(): Promise<DiskSettlement>;
  /** Replaces the document; only an Automerge replica supports it. */
  update(updateCallback: (doc: AutomergeDoc<T>) => AutomergeDoc<T>): void;
  delete(): void;
}

export type SaveStateChangedEvent = {
  unsavedDocuments: DocumentId[];
};

/**
 * Changes of one document the host refused: they are no longer visible and will never be saved. Only
 * a tab document can see this, when the host's check of a change fails, which is a bug; a replica
 * never fires it.
 */
export type EditsRejectedEvent = {
  documentId: DocumentId;
  /** The refused changes, with every change built on them. */
  hashes: readonly string[];
  reason: string;
};

export interface ClientRepo {
  readonly handles: Record<string, ClientDocHandle<unknown>>;
  readonly saveStateChanged: Event<SaveStateChangedEvent>;
  readonly editsRejected: Event<EditsRejectedEvent>;
  find<T>(id: AnyDocumentId): ClientDocHandle<T>;
  /** Finds a document of objects, which a repo that takes index copies shows from the copy while it is only read. */
  findIndexed<T>(id: AnyDocumentId): ClientDocHandle<T>;
  /** Keeps a document copy a query carried for its first {@link findIndexed}; a repo that takes none ignores it. */
  primeCopy(documentId: string, copy: Contract.Copy): void;
  create<T>(initialValue?: T): ClientDocHandle<T>;
  import<T>(dump: Uint8Array): ClientDocHandle<T>;
  release(documentId: DocumentId): boolean;
  flush(options?: { disk?: boolean }): Promise<void>;
  flushCreations(): Promise<void>;
  open(ctx?: Context): Promise<unknown>;
  close(ctx?: Context): Promise<unknown>;
  /** Replaces service clients after the worker changed. */
  _updateServices(services: { dataService: DataService.Client }): void;
  _onReconnect(): Promise<void>;
}
