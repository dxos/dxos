//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';

import { encodeChange } from './encode.ts';
import { type Change, type Clock, type DecodedOp, formatId } from './ids.ts';
import { Model } from './model.ts';
import { saveNoCompress } from './save.ts';
import { type HostMessage, type Snapshot } from './tab.ts';

type Subscriber = (message: HostMessage) => void;

/** A change waiting to be applied or saved, with every tab that sent it, so each gets the ack. */
type Queued = { change: Change; bytes: Uint8Array; from: Set<string> };

type HostDoc = {
  doc: A.Doc<unknown>;
  model: Model;
  subscribers: Map<string, Subscriber>;
  nextSeq: Map<string, number>;
  queue: Queued[];
  unacked: Queued[];
  persisted: Uint8Array;
};

const HOST_ACTOR = 'f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0';

/** `A.decodeChange` as the model's change type: Automerge's `Op` type leaves out `elemId` and `insert`. */
export const decodeChange = (bytes: Uint8Array): Change => {
  const decoded = A.decodeChange(bytes);
  return {
    actor: decoded.actor,
    seq: decoded.seq,
    startOp: decoded.startOp,
    time: decoded.time,
    message: decoded.message,
    deps: decoded.deps,
    hash: decoded.hash,
    ops: decoded.ops.map((op) => ({
      action: op.action,
      obj: op.obj,
      ...('elemId' in op && typeof op.elemId === 'string' ? { elemId: op.elemId } : { key: op.key }),
      ...('insert' in op && op.insert === true ? { insert: true } : {}),
      // Automerge gives bytes as a plain array; a set op's value is never an array otherwise.
      ...(op.value !== undefined ? { value: Array.isArray(op.value) ? Uint8Array.from(op.value) : op.value } : {}),
      ...(op.datatype !== undefined ? { datatype: op.datatype } : {}),
      pred: op.pred,
    })),
  };
};

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index]);

/**
 * The worker: holds each document in Automerge and in the model, which serves as the index for checking
 * a tab's references. A tab's change is written under the tab's own actor and ids.
 */
export class SpikeHost {
  readonly #docs = new Map<string, HostDoc>();
  /** How many times the host called `A.applyChanges`, to show batching. */
  applyCalls = 0;
  /** Acknowledge only after a save, so a restart never loses an acknowledged change. */
  persistOnFlush = true;

  create<T extends Record<string, unknown>>(docId: string, initial: T): A.Doc<T> {
    return this.adopt(docId, A.from(initial, { actor: HOST_ACTOR }));
  }

  adopt<T>(docId: string, doc: A.Doc<T>): A.Doc<T> {
    const bytes = saveNoCompress(doc);
    const model = Model.fromSaved(
      bytes,
      A.getAllChanges(doc).map((change) => A.decodeChange(change).hash),
    );
    this.#docs.set(docId, {
      doc,
      model,
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

  /** The host's model of a document, for comparing with Automerge's. */
  model(docId: string): Model {
    return this.#get(docId).model;
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
      hashes: A.getAllChanges(hostDoc.doc).map((change) => A.decodeChange(change).hash),
      heads: A.getHeads(hostDoc.doc),
    };
  }

  /** A document the tab created: its first change creates the document here. */
  createFromTab(docId: string, tabId: string, deliver: Subscriber): void {
    const doc = A.init({ actor: HOST_ACTOR });
    this.#docs.set(docId, {
      doc,
      model: new Model(),
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
    if (this.refuseWhen?.(claimed)) {
      return refuse('refused by the test');
    }
    // Validate what the bytes say, not what the tab claims about them.
    const change = decodeChange(bytes);
    if (change.hash !== claimed.hash) {
      return refuse(`hash ${change.hash} does not match the claimed ${claimed.hash}`);
    }
    if (hostDoc.model.hasChange(change.hash)) {
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
    // Automerge indexes a change under the hash of the bytes it was given but exports it re-encoded,
    // so bytes that are not canonical would leave heads no other peer can ever reach.
    if (!sameBytes(encodeChange(change).bytes, bytes)) {
      return refuse('not canonically encoded');
    }
    if (change.deps.some((dep) => !hostDoc.model.hasChange(dep))) {
      return refuse('unknown dependency');
    }
    const expected = hostDoc.nextSeq.get(change.actor) ?? 1;
    if (change.seq !== expected) {
      return refuse(`seq ${change.seq}, expected ${expected}`);
    }
    const baseClock = hostDoc.model.clockOf(change.deps);
    const baseMax = Math.max(0, ...baseClock.values());
    if (change.startOp <= baseMax) {
      return refuse(`start op ${change.startOp} is not above ${baseMax}`);
    }

    // Check each op against the version the tab edited plus the ops before it, applying as it goes.
    const clock = new Map(baseClock);
    let applied = 0;
    try {
      change.ops.forEach((op, index) => {
        check(hostDoc.model, op, clock);
        hostDoc.model.applyOp(formatId([change.startOp + index, change.actor]), op);
        clock.set(change.actor, change.startOp + index);
        applied++;
      });
    } catch (err) {
      hostDoc.model.remove([{ ...change, ops: change.ops.slice(0, applied) }]);
      return refuse(err instanceof Error ? err.message : String(err));
    }
    hostDoc.model.registerChange(change);
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
    const unknown = fresh.filter((entry) => !hostDoc.model.hasChange(entry.change.hash));
    for (const entry of unknown) {
      hostDoc.model.applyChange(entry.change);
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

/** Refuses an op whose object, element or overwritten values do not match the version it names. */
const check = (model: Model, op: DecodedOp, clock: Clock): void => {
  if (!model.hasObject(op.obj, clock)) {
    throw new Error(`unknown object ${op.obj}`);
  }
  const type = model.typeOf(op.obj);
  const same = (left: string[], right: string[]) =>
    left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
  if (type === 'map') {
    if (op.key === undefined) {
      throw new Error('map op without a key');
    }
    const current = model.currentValueIds(op.obj, op.key, clock);
    if (!same(current, op.pred)) {
      throw new Error(`pred ${op.pred} does not match ${current}`);
    }
    return;
  }
  if (op.elemId === undefined) {
    throw new Error('sequence op without an element');
  }
  if (op.insert) {
    if (op.elemId !== '_head' && model.elementValueIdsOf(op.obj, op.elemId, clock) === undefined) {
      throw new Error(`unknown element ${op.elemId}`);
    }
    if (op.pred.length > 0) {
      throw new Error('insert with a pred');
    }
    return;
  }
  const current = model.elementValueIdsOf(op.obj, op.elemId, clock);
  if (current === undefined || current.length === 0) {
    throw new Error(`element ${op.elemId} is not visible`);
  }
  if (!same(current, op.pred)) {
    throw new Error(`pred ${op.pred} does not match ${current}`);
  }
};
