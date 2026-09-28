//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { decodeChange, hashesOf, saveNoCompress } from '../internal/automerge.ts';
import { CheckIndex } from '../internal/check-index.ts';
import { encodeChange } from '../internal/encode.ts';
import { type Change } from '../internal/ids.ts';
import { type HostMessage, type Snapshot } from '../internal/tab-doc.ts';

type Subscriber = (message: HostMessage) => void;

/** A change waiting to be applied or saved, with every tab that sent it, so each gets the ack. */
type Queued = { change: Change; bytes: Uint8Array; from: Set<string> };

type HostDoc = {
  doc: A.Doc<unknown>;
  index: CheckIndex;
  subscribers: Map<string, Subscriber>;
  nextSeq: Map<string, number>;
  queue: Queued[];
  unacked: Queued[];
  persisted: Uint8Array;
};

const HOST_ACTOR = 'f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0';

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index]);

/**
 * A synchronous host in memory for tests of tab documents: holds each document in Automerge, plus a
 * check index for checking a tab's references, and writes a tab's change under the tab's own ids.
 */
export class MemoryTabHost {
  readonly #docs = new Map<string, HostDoc>();
  /** How many times the host called `A.applyChanges`, to show batching. */
  applyCalls = 0;
  /** Acknowledge only after a save, so a restart never loses an acknowledged change. */
  persistOnFlush = true;

  create<T extends Record<string, unknown>>(docId: string, initial: T): A.Doc<T> {
    return this.adopt(docId, A.from(initial, { actor: HOST_ACTOR }));
  }

  adopt<T>(docId: string, doc: A.Doc<T>): A.Doc<T> {
    this.#docs.set(docId, {
      doc,
      index: CheckIndex.fromSaved(saveNoCompress(doc), hashesOf(doc)),
      subscribers: new Map(),
      nextSeq: seqsOf(doc),
      queue: [],
      unacked: [],
      persisted: A.save(doc),
    });
    return doc;
  }

  /** The worker's Automerge document; `T` is the caller's claim about its shape, as in `A.load<T>`. */
  doc<T>(docId: string): A.Doc<T> {
    // The host holds documents of every shape, so only the caller can name this one's.
    return this.#get(docId).doc as A.Doc<T>;
  }

  #get(docId: string): HostDoc {
    const hostDoc = this.#docs.get(docId);
    if (!hostDoc) {
      throw new Error(`Unknown document ${docId}`);
    }
    return hostDoc;
  }

  /** A tab follows a document: the saved bytes, change hashes and heads, then every later change. */
  subscribe(docId: string, tabId: string, deliver: Subscriber): Snapshot {
    this.flush(docId);
    const hostDoc = this.#get(docId);
    hostDoc.subscribers.set(tabId, deliver);
    return {
      bytes: saveNoCompress(hostDoc.doc),
      hashes: hostDoc.index.snapshotHashes(),
      heads: A.getHeads(hostDoc.doc),
    };
  }

  /** A document the tab created: its first change creates the document here. */
  createFromTab(docId: string, tabId: string, deliver: Subscriber): void {
    const doc = A.init({ actor: HOST_ACTOR });
    this.#docs.set(docId, {
      doc,
      index: new CheckIndex(),
      subscribers: new Map([[tabId, deliver]]),
      nextSeq: new Map(),
      queue: [],
      unacked: [],
      persisted: A.save(doc),
    });
  }

  /** A tab's change, as the chunk the tab encoded: checked, then applied as those exact bytes. */
  submit(docId: string, tabId: string, claimed: Change, bytes: Uint8Array): void {
    const hostDoc = this.#get(docId);
    const refuse = (reason: string) => hostDoc.subscribers.get(tabId)?.({ type: 'refuse', hash: claimed.hash, reason });
    // Validate what the bytes say, not what the tab claims about them.
    const change = decodeChange(bytes);
    if (change.hash !== claimed.hash) {
      return refuse(`hash ${change.hash} does not match the claimed ${claimed.hash}`);
    }
    if (hostDoc.index.hasChange(change.hash)) {
      // A change the host already has, resent or relayed by another tab. It is acknowledged now if
      // already saved, or with the save that covers it.
      const waiting = [...hostDoc.queue, ...hostDoc.unacked].find((entry) => entry.change.hash === change.hash);
      if (waiting) {
        waiting.from.add(tabId);
      } else {
        hostDoc.subscribers.get(tabId)?.({ type: 'ack', hash: change.hash });
      }
      return;
    }
    // A change the host holds is never refused, as the real host checks only what it lacks.
    if (this.refuseWhen?.(claimed)) {
      return refuse('refused by the test');
    }
    // Automerge indexes a change under the hash of the bytes it was given but exports it re-encoded,
    // so bytes that are not canonical would leave heads no other peer can ever reach.
    if (!sameBytes(encodeChange(change).bytes, bytes)) {
      return refuse('not canonically encoded');
    }
    if (change.deps.some((dep) => !hostDoc.index.hasChange(dep))) {
      return refuse('unknown dependency');
    }
    const expected = hostDoc.nextSeq.get(change.actor) ?? 1;
    if (change.seq !== expected) {
      return refuse(`seq ${change.seq}, expected ${expected}`);
    }
    // Each op is checked against the version the tab edited plus the ops before it.
    const reason = hostDoc.index.accept(change, hostDoc.index.clockOf(change.deps));
    if (reason !== undefined) {
      return refuse(reason);
    }
    hostDoc.nextSeq.set(change.actor, change.seq + 1);
    hostDoc.queue.push({ change, bytes, from: new Set([tabId]) });
  }

  /** Test hook: refuse a change as if it failed a check. */
  refuseWhen?: (change: Change) => boolean;

  /** Applies every queued change of a document in one call, then saves and acknowledges. */
  flush(docId?: string): void {
    for (const [id, hostDoc] of this.#docs) {
      if ((docId !== undefined && id !== docId) || hostDoc.queue.length === 0) {
        continue;
      }
      const queued = hostDoc.queue.splice(0);
      [hostDoc.doc] = A.applyChanges(
        hostDoc.doc,
        queued.map((entry) => entry.bytes),
      );
      this.applyCalls++;
      for (const entry of queued) {
        for (const [tabId, deliver] of hostDoc.subscribers) {
          if (!entry.from.has(tabId)) {
            deliver({ type: 'change', change: entry.change });
          }
        }
      }
      hostDoc.unacked.push(...queued);
      if (this.persistOnFlush) {
        this.persist(id);
      }
    }
  }

  /** Saves a document and acknowledges what the save covers. */
  persist(docId: string): void {
    const hostDoc = this.#get(docId);
    hostDoc.persisted = A.save(hostDoc.doc);
    for (const entry of hostDoc.unacked.splice(0)) {
      for (const tabId of entry.from) {
        hostDoc.subscribers.get(tabId)?.({ type: 'ack', hash: entry.change.hash });
      }
    }
  }

  /** Changes from another peer, merged as sync would merge them. */
  applyRemote(docId: string, changes: Uint8Array[]): void {
    const hostDoc = this.#get(docId);
    const fresh = changes.map((bytes) => ({ bytes, change: decodeChange(bytes) }));
    const unknown = fresh.filter((entry) => !hostDoc.index.hasChange(entry.change.hash));
    for (const entry of unknown) {
      hostDoc.index.applyChange(entry.change);
      hostDoc.nextSeq.set(entry.change.actor, entry.change.seq + 1);
    }
    [hostDoc.doc] = A.applyChanges(
      hostDoc.doc,
      unknown.map((entry) => entry.bytes),
    );
    this.applyCalls++;
    for (const entry of unknown) {
      for (const deliver of hostDoc.subscribers.values()) {
        deliver({ type: 'change', change: entry.change });
      }
    }
  }

  /** Loses everything not saved, as an abrupt worker restart does, and drops every subscription. */
  restart(): void {
    for (const [docId, hostDoc] of this.#docs) {
      this.adopt(docId, A.load(hostDoc.persisted));
    }
  }

  /** Forks a document at `heads` into a new document, as `createBranch` would ask the worker to. */
  fork(docId: string, forkId: string, heads?: string[]): void {
    const source = this.#get(docId).doc;
    this.adopt(forkId, A.clone(heads ? A.view(source, heads) : source, { actor: HOST_ACTOR }));
  }

  /** Copies a document into a new one, as a migration's `A.save` then `repo.import` does. */
  copy(docId: string, copyId: string): void {
    this.flush(docId);
    this.adopt(copyId, A.load(A.save(this.#get(docId).doc)));
  }

  /** Merges `sourceId` into `targetId`; subscribers of the target receive the new changes. */
  merge(targetId: string, sourceId: string): void {
    this.flush();
    const target = this.#get(targetId).doc;
    const source = this.#get(sourceId).doc;
    const have = new Set(A.getAllChanges(target).map((change) => A.decodeChange(change).hash));
    const changes = A.getAllChanges(source).filter((change) => !have.has(A.decodeChange(change).hash));
    this.applyRemote(targetId, changes);
  }
}

/** The next expected seq of each actor in a document. */
const seqsOf = (doc: A.Doc<unknown>): Map<string, number> => {
  const seqs = new Map<string, number>();
  for (const change of A.getAllChanges(doc)) {
    const { actor, seq } = A.decodeChange(change);
    seqs.set(actor, Math.max(seqs.get(actor) ?? 1, seq + 1));
  }
  return seqs;
};
