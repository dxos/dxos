//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Op from '@dxos/automerge-proxy/Op';
import { type Obj } from '@dxos/echo';
import { DATA_NAMESPACE, isEncodedReference } from '@dxos/echo-protocol';
import {
  KindId,
  MetaId,
  ObjectDatabaseId,
  ObjectDeletedId,
  ParentId,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  SCALAR_META_FIELDS,
  SchemaId,
  SelfURIId,
  SnapshotKindId,
  TypeEntityId,
  TypeId,
  getProxyTarget,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';

import { lookupRef } from '../echo-handler/echo-prototypes.ts';
import { type ProxyTarget, getObjectCore } from '../echo-handler/index.ts';
import { MirrorDocHandle } from './mirror-doc-handle.ts';

/** Read from the live object, as `getSnapshot` does: they describe the object, not its stored fields. */
const LIVE_SYMBOLS = [
  TypeId,
  SchemaId,
  TypeEntityId,
  SelfURIId,
  ObjectDatabaseId,
  ObjectDeletedId,
  ParentId,
  RelationSourceDXNId,
  RelationTargetDXNId,
  RelationSourceId,
  RelationTargetId,
];

/** The fields and symbols `getSnapshot` gives an object, read from its stored node. */
export type MirrorSnapshot = Readonly<Record<string | symbol, unknown>>;

type Projection = {
  readonly node: unknown;
  readonly snapshot: MirrorSnapshot;
  /** Decoded form of each stored subtree, so an unchanged subtree decodes to the same value. */
  readonly decoded: WeakMap<object, unknown>;
};

/**
 * An object's snapshot read from its mirror document rather than through the object's proxy. It is
 * derived from the document atom, returns the previous snapshot while the object's node is unchanged,
 * and reuses the decoded form of every unchanged subtree, so readers get stable values.
 */
export const mirrorSnapshotAtom = Atom.family((obj: Obj.Unknown) => {
  const core = getObjectCore(obj);
  const projector = createProjector(obj);
  return Atom.make((get): MirrorSnapshot => {
    const handle = core.docHandle;
    invariant(handle instanceof MirrorDocHandle, 'object is not in a mirror document');
    return projector(Op.getAt(get(handle.atom), core.mountPath));
  });
});

/**
 * The same projection, notified per object by the database's own change routing rather than by the
 * document atom, so a change to one object does not re-run every object mounted from its document.
 */
export const routedSnapshotAtom = Atom.family((obj: Obj.Unknown) => {
  const core = getObjectCore(obj);
  const projector = createProjector(obj);
  const read = (): MirrorSnapshot => {
    const handle = core.docHandle;
    invariant(handle instanceof MirrorDocHandle, 'object is not in a mirror document');
    return projector(Op.getAt(handle.doc(), core.mountPath));
  };
  return Atom.make((get): MirrorSnapshot => {
    get.addFinalizer(core.updates.on(() => get.setSelf(read())));
    return read();
  });
});

/** Projects an object's node, returning the previous snapshot while the node is unchanged. */
const createProjector = (obj: Obj.Unknown) => {
  let last: Projection | undefined;
  return (node: unknown): MirrorSnapshot => {
    if (last !== undefined && last.node === node) {
      return last.snapshot;
    }
    const decoded = last?.decoded ?? new WeakMap<object, unknown>();
    const snapshot = project(obj, node, decoded);
    last = { node, snapshot, decoded };
    return snapshot;
  };
};

const project = (obj: Obj.Unknown, node: unknown, decoded: WeakMap<object, unknown>): MirrorSnapshot => {
  const target = getProxyTarget<ProxyTarget>(obj);
  const data = decodeStored(Op.getAt(node, [DATA_NAMESPACE]) ?? {}, target, decoded);
  const snapshot: Record<string | symbol, unknown> = { id: obj.id };
  if (Op.isContainer(data) && !Array.isArray(data)) {
    Object.assign(snapshot, data);
  }
  snapshot[SnapshotKindId] = Reflect.get(obj, KindId);
  for (const symbol of LIVE_SYMBOLS) {
    const value = readLive(obj, symbol);
    if (value !== undefined) {
      Object.defineProperty(snapshot, symbol, { value, enumerable: false });
    }
  }
  const meta = readLive(obj, MetaId);
  if (meta !== undefined) {
    Object.defineProperty(snapshot, MetaId, { value: copyMeta(meta), enumerable: false });
  }
  return Object.freeze(snapshot);
};

/** Relation endpoint getters throw on an object that is not a relation, which `getSnapshot` also tolerates. */
const readLive = (obj: Obj.Unknown, symbol: symbol): unknown => {
  try {
    return Reflect.get(obj, symbol);
  } catch {
    return undefined;
  }
};

/** The copy `getSnapshot` makes, so the snapshot does not follow later edits to the live meta. */
const copyMeta = (meta: unknown): Record<string, unknown> => {
  const field = (key: string): unknown => (Op.isContainer(meta) ? Reflect.get(meta, key) : undefined);
  const list = (key: string): unknown[] => {
    const value = field(key);
    return Array.isArray(value) ? [...value] : [];
  };
  const annotations = field('annotations');
  const copy: Record<string, unknown> = {
    keys: list('keys'),
    tags: list('tags'),
    ...(Op.isContainer(annotations) ? { annotations: { ...annotations } } : {}),
  };
  for (const key of SCALAR_META_FIELDS) {
    if (field(key) != null) {
      copy[key] = field(key);
    }
  }
  return copy;
};

/** Decodes a stored value as `ObjectCore.decode` does, turning references into refs, and shares unchanged subtrees. */
const decodeStored = (value: unknown, target: ProxyTarget, decoded: WeakMap<object, unknown>): unknown => {
  if (value instanceof A.RawString) {
    return value.toString();
  }
  if (isEncodedReference(value)) {
    return lookupRef(target, value);
  }
  if (!Op.isContainer(value)) {
    return value;
  }
  const cached = decoded.get(value);
  if (cached !== undefined) {
    return cached;
  }
  const result = Object.freeze(
    Array.isArray(value)
      ? value.map((entry) => decodeStored(entry, target, decoded))
      : Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decodeStored(entry, target, decoded)])),
  );
  decoded.set(value, result);
  return result;
};
