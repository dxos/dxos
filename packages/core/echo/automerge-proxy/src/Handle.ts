//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { ChangeFn, ChangeOptions, Doc, Heads, Patch } from '@automerge/automerge';
import { EventEmitter } from 'eventemitter3';

import { Event, Trigger, TriggerState } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import type * as Contract from './Contract.ts';
import { DocumentUnavailableError } from './errors.ts';
import { type Change } from './internal/ids.ts';
import { randomId } from './internal/index.ts';
import { readChange } from './internal/reader.ts';
import { TabDoc } from './internal/tab-doc.ts';

export { type Snapshot, type TabChange, TabDoc, type TabDocument, tagOf } from './internal/tab-doc.ts';

/**
 * `pending` until the host answers, `requesting` while it fetches a document its storage lacks,
 * `ready` once the document is usable, and `unavailable` when the host cannot produce it.
 */
export type State = 'pending' | 'requesting' | 'ready' | 'unavailable';

export type ChangeEvent<T> = {
  handle: DocHandle<T>;
  doc: Doc<T>;
  patches: Patch[];
  /**
   * `change` is a write through this handle; `host` is anything the host delivered; `bulk` is part of
   * a large delivery, such as a first load, whose fan-out a listener may coalesce.
   */
  patchInfo: { before: Doc<T>; after: Doc<T>; source: 'change' | 'host' | 'bulk' };
};

export type Events<T> = {
  change: ChangeEvent<T>;
  delete: { handle: DocHandle<T> };
  /** The handle left `unavailable` because the document arrived after all. */
  available: { handle: DocHandle<T> };
};

export type Options<T, Id extends string> = {
  documentId?: Id;
  /** Content of a document this tab is creating: its first change, written at once. */
  initialValue?: T;
  /** Changes of a document this tab is creating from another's history, as `repo.import` brings them. */
  initialChanges?: readonly Uint8Array[];
  onDelete?: () => void;
  /** The error {@link DocHandle.whenReady} rejects with when the host cannot produce the document. */
  unavailableError?: (documentId: string) => Error;
};

/** The host refused one of this tab's changes; it is gone, with every pending change built on it. */
export type Refusal = { hashes: string[]; reason: string };

/**
 * A document handle over a {@link TabDoc}: reads and writes are synchronous and heads are final the
 * moment a tab writes, since the tab encodes each change as Automerge would. A repo feeds the handle
 * the host's events through {@link _receive} and sends what {@link _takeOutgoing} returns.
 */
export class DocHandle<T, Id extends string = string> extends EventEmitter<Events<T>> {
  readonly _internalId = randomId();

  /** Fires when changes are waiting to be sent. */
  readonly outgoing = new Event<void>();

  /** Fires when the host acknowledges changes, which is when a flush re-checks what is still pending. */
  readonly acknowledged = new Event<void>();

  /** Fires with this tab's changes the host refused. */
  readonly refused = new Event<Refusal>();

  readonly #tab: TabDoc<T>;
  readonly #onDelete?: () => void;
  readonly #unavailableError: (documentId: string) => Error;
  readonly #ready = new Trigger();
  readonly #stored = new Trigger<boolean>();
  /** Changes to send, by hash, in the order the tab wrote or resent them. */
  readonly #outgoing = new Map<string, Uint8Array>();
  /** Created by this tab, so a flush waits for the host to name it. */
  readonly #created: boolean;
  #state: State = 'pending';
  #documentId?: Id;
  #deleted = false;
  /** The next answer to a follow is the first this handle has, so it is a bulk delivery. */
  #loaded = false;

  constructor({ documentId, initialValue, initialChanges, onDelete, unavailableError }: Options<T, Id>) {
    super();
    this.#documentId = documentId;
    this.#onDelete = onDelete;
    this.#unavailableError = unavailableError ?? ((documentId) => new DocumentUnavailableError(documentId));
    this.#created = documentId === undefined;
    const send = (change: Change, bytes: Uint8Array) => {
      this.#outgoing.set(change.hash, bytes);
      this.outgoing.emit();
    };
    if (this.#created && initialChanges) {
      // Relayed like changes `A.merge` brings, so the creation carries the whole history.
      this.#tab = TabDoc.fromChanges<T>([], { send });
      this.#tab.applyChanges(initialChanges.map(changeOf));
    } else if (this.#created) {
      const root = initialValue ?? {};
      invariant(typeof root === 'object' && root !== null && !Array.isArray(root), 'A document is a map at its root');
      this.#tab = TabDoc.create<T>(root, { send });
    } else {
      this.#tab = TabDoc.fromChanges<T>([], { send });
    }
    this.#tab.on(({ before, after, patches, source }) => {
      const bulk = source === 'host' && !this.#loaded && this.#state !== 'ready';
      this.emit('change', {
        handle: this,
        doc: after,
        patches,
        patchInfo: { before, after, source: bulk ? 'bulk' : source },
      });
    });
    this.#tab.onRejected((changes, reason) => {
      this.refused.emit({ hashes: changes.map((change) => change.hash), reason });
    });
    if (this.#created) {
      // Readable and writable at once; the host names it later.
      this.#loaded = true;
    }
  }

  /** The tab document, for the namespace and for tests. */
  get tab(): TabDoc<T> {
    return this.#tab;
  }

  get documentId(): Id | undefined {
    return this.#documentId;
  }

  get state(): State {
    return this.#state;
  }

  /** Heads of the current version; a write moves them at once. */
  get heads(): Heads {
    return this.#tab.heads();
  }

  /** Whether changes this tab wrote or relayed await the host's acknowledgment. */
  get hasPending(): boolean {
    return this.#tab.pending.length > 0 || this.#outgoing.size > 0;
  }

  /** A document this tab created that the host has not named yet. */
  get awaitingCreation(): boolean {
    return this.#created && this.#documentId === undefined;
  }

  get isDeleted(): boolean {
    return this.#deleted;
  }

  doc(): Doc<T> {
    invariant(!this.#deleted, 'DocHandle.doc called on deleted doc');
    return this.#tab.doc();
  }

  /** Resolves once the document is usable: found, once the host answers; created, once the host has named it. */
  async whenReady(): Promise<void> {
    await this.#ready.wait();
  }

  isReady(): boolean {
    return this.#ready.state === TriggerState.RESOLVED;
  }

  /** True once the document is ready from the host's storage; false when the host is fetching it or cannot produce it. */
  async whenStored(): Promise<boolean> {
    return this.#stored.wait();
  }

  change(callback: ChangeFn<T>, options?: ChangeOptions<T>): void {
    invariant(!this.#deleted, 'DocHandle.change called on deleted doc');
    this.#tab.change(callback, changeOptions(options));
  }

  /** A change based on `heads`, which the tab holds; returns the heads of that version plus the change. */
  changeAt(heads: Heads, callback: ChangeFn<T>, options?: ChangeOptions<T>): Heads | undefined {
    invariant(!this.#deleted, 'DocHandle.changeAt called on deleted doc');
    return this.#tab.changeAt(heads, callback, changeOptions(options));
  }

  delete(): void {
    this.#onDelete?.();
    this.emit('delete', { handle: this });
    this.#deleted = true;
  }

  /** The heads to follow the document from, when this tab holds any of it. */
  _followHeads(): string[] | undefined {
    const heads = this.#tab.heads();
    return heads.length > 0 ? heads : undefined;
  }

  /** The changes this tab's first changes a creation carries, in the order the tab wrote them. */
  _creationChanges(): Uint8Array[] {
    return [...this.#outgoing.values()];
  }

  /** The changes waiting to be sent, which the caller now owns; they go back with {@link _returnOutgoing} on failure. */
  _takeOutgoing(): Contract.Change[] {
    const changes = [...this.#outgoing].map(([hash, bytes]) => ({ hash, bytes }));
    this.#outgoing.clear();
    return changes;
  }

  /** Queues changes again after a send that did not reach the host, ahead of anything written since. */
  _returnOutgoing(changes: readonly Contract.Change[]): void {
    const later = [...this.#outgoing];
    this.#outgoing.clear();
    for (const { hash, bytes } of changes) {
      this.#outgoing.set(hash, bytes);
    }
    for (const [hash, bytes] of later) {
      this.#outgoing.set(hash, bytes);
    }
    if (this.#outgoing.size > 0) {
      this.outgoing.emit();
    }
  }

  /** Names a document this tab created, once the host has minted its id; it is ready from then on. */
  _setDocumentId(documentId: Id): void {
    this.#documentId = documentId;
    this.#state = 'ready';
    this.#ready.wake();
    this.#stored.wake(true);
  }

  /** Rejects {@link whenReady}, for a creation the host never took. */
  _failReady(error: Error): void {
    this.#ready.throw(error);
  }

  /** Integrates an event from the host. */
  _receive(event: Contract.DocumentEvent): void {
    switch (event.type) {
      case 'snapshot': {
        const snapshot = { bytes: event.bytes, hashes: event.hashes, heads: [...event.heads] };
        if (this.#loaded) {
          // A later answer: take what the host has and queue what it lacks again, dependencies first.
          this.#outgoing.clear();
          this.#tab.reconnect(snapshot);
        } else {
          this.#tab.open(snapshot);
        }
        this.#answered();
        return;
      }
      case 'changes':
        this.#tab.receiveChanges(event.changes.map((bytes) => changeOf(bytes)));
        return;
      case 'caughtUp':
        // The host holds every change this tab followed with; the pending ones go again, dependencies
        // first, for their acks.
        this.#outgoing.clear();
        this.#tab.resend();
        this.#answered();
        return;
      case 'ack':
        for (const hash of event.hashes) {
          this.#tab.receive({ type: 'ack', hash });
        }
        this.acknowledged.emit();
        return;
      case 'refuse':
        this.#tab.receive({ type: 'refuse', hash: event.hash, reason: event.reason });
        this.acknowledged.emit();
        return;
      case 'copy':
        // Copies serve index reads, which a tab document does not take yet.
        return;
      case 'requesting':
        return this.#markRequesting();
      case 'unavailable':
        return this.#markUnavailable(event.documentId);
    }
  }

  #answered(): void {
    this.#loaded = true;
    const recovered = this.#state === 'unavailable';
    if (this.#ready.state === TriggerState.REJECTED) {
      this.#ready.reset();
    }
    this.#state = 'ready';
    this.#ready.wake();
    if (recovered) {
      this.emit('available', { handle: this });
    }
    if (this.#stored.state !== TriggerState.RESOLVED) {
      this.#stored.wake(true);
    }
    // Pending changes were resent into the outgoing queue.
    if (this.#outgoing.size > 0) {
      this.outgoing.emit();
    }
  }

  /** Not in the host's storage: storage-only callers settle now; the document may still arrive. */
  #markRequesting(): void {
    if (this.#state !== 'pending') {
      return;
    }
    this.#state = 'requesting';
    if (this.#stored.state !== TriggerState.RESOLVED) {
      this.#stored.wake(false);
    }
  }

  /** The host cannot produce the document; a later answer still makes it available. */
  #markUnavailable(documentId: string): void {
    if (this.#state === 'ready') {
      return;
    }
    this.#state = 'unavailable';
    this.#ready.throw(this.#unavailableError(documentId));
    if (this.#stored.state !== TriggerState.RESOLVED) {
      this.#stored.wake(false);
    }
  }
}

/** Automerge's change options: a message, or a message and time; the patch callback does not apply to a tab. */
const changeOptions = <T>(options?: ChangeOptions<T>): { message?: string; time?: number } | undefined => {
  if (options === undefined) {
    return undefined;
  }
  if (typeof options === 'string') {
    return { message: options };
  }
  return {
    ...(options.message !== undefined ? { message: options.message } : {}),
    ...(options.time !== undefined ? { time: options.time } : {}),
  };
};

const changeOf = (bytes: Uint8Array): Change => {
  const { end: _end, ...change } = readChange(bytes);
  return change;
};
