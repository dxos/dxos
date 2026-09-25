//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, type DocumentId, stringifyAutomergeUrl } from '@automerge/automerge-repo';

import { Handle } from '@dxos/automerge-proxy';
import { invariant } from '@dxos/invariant';

import { type ClientDocHandle, type DiskSettlement } from '../automerge/client-handle.ts';
import { DocumentUnavailableError } from '../errors.ts';

/** Opens and closes real Automerge replicas of documents, for {@link MirrorDocHandle.leaseReplica}. */
export type ReplicaSource = {
  open: <T>(documentId: DocumentId) => Promise<ClientDocHandle<T>>;
  close: (documentId: DocumentId) => void;
};

/** A replica held until released; see {@link MirrorDocHandle.leaseReplica}. */
export type ReplicaLease<T> = {
  readonly ready: Promise<ClientDocHandle<T>>;
  release(): void;
};

export type MirrorDocHandleOptions<T> = Omit<Handle.Options<T, DocumentId>, 'unavailableError'> & {
  replicas?: ReplicaSource;
};

/**
 * The proxy handle ECHO's database layer loads in mirror mode: a {@link Handle.DocHandle} with ECHO's
 * handle interface, and a real Automerge replica on lease for code that needs the Automerge API.
 */
export class MirrorDocHandle<T> extends Handle.DocHandle<T, DocumentId> implements ClientDocHandle<T> {
  readonly #replicas?: ReplicaSource;
  /** Callers holding a {@link leaseReplica}; the replica closes with the last one. */
  #replicaUsers = 0;
  #replicaOpening?: Promise<ClientDocHandle<T>>;
  #replica?: ClientDocHandle<T>;

  constructor({ replicas, ...options }: MirrorDocHandleOptions<T>) {
    super({ ...options, unavailableError: (documentId) => new DocumentUnavailableError({ documentId }) });
    this.#replicas = replicas;
  }

  get url(): AutomergeUrl | undefined {
    return this.documentId ? stringifyAutomergeUrl(this.documentId) : undefined;
  }

  /** The replica a {@link leaseReplica} holds, once it has loaded. */
  get replica(): ClientDocHandle<T> | undefined {
    return this.#replica;
  }

  async whenSettledOnDisk(): Promise<DiskSettlement> {
    return this.whenStored();
  }

  update(): void {
    throw new Error('Replacing a document is not supported by a mirror handle');
  }

  /**
   * Holds a real Automerge replica of this document until released, for code that needs the
   * Automerge API; the mirror carries on as before. A document this tab created opens once the worker
   * has named it.
   */
  leaseReplica(): ReplicaLease<T> | undefined {
    const replicas = this.#replicas;
    if (!replicas) {
      return undefined;
    }
    this.#replicaUsers++;
    if (!this.#replicaOpening) {
      const opening: Promise<ClientDocHandle<T>> = this.#named()
        .then((documentId) => replicas.open<T>(documentId))
        .then(
          (replica) => {
            if (this.#replicaOpening === opening) {
              this.#replica = replica;
            }
            return replica;
          },
          (error) => {
            if (this.#replicaOpening === opening) {
              this.#replicaOpening = undefined;
            }
            throw error;
          },
        );
      this.#replicaOpening = opening;
    }
    const ready = this.#replicaOpening;
    let released = false;
    return {
      ready,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        if (--this.#replicaUsers > 0) {
          return;
        }
        this.#replicaOpening = undefined;
        this.#replica = undefined;
        // Unless a new lease reopened it in the meantime.
        void ready.then(
          () => {
            if (!this.#replicaOpening && this.documentId) {
              replicas.close(this.documentId);
            }
          },
          () => {},
        );
      },
    };
  }

  /** The document's id, which a document this tab created has once the worker's first snapshot arrives. */
  async #named(): Promise<DocumentId> {
    if (!this.documentId) {
      await this.whenReady();
    }
    invariant(this.documentId, 'a ready mirror handle names its document');
    return this.documentId;
  }
}
