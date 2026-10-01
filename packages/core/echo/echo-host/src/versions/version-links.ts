//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { Lens } from '@dxos/echo';
import { DatabaseDirectory, EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { getDeep } from '@dxos/util';

import { isRecord } from './encoded-value.ts';
import { ancestorsOf, changeGraphOf } from './version-history.ts';
import { type VersionDocHandle, type VersionStore } from './version-runner.ts';
import {
  type Absorbed,
  type Projection,
  type VersionDoc,
  absorbedCopy,
  absorbedOriginsOf,
  absorbedToParent,
  creationOf,
  dataOf,
  deriveLinkDoc,
  elementToParent,
  hashOf,
  linkRootOf,
  linkToParent,
  parentDeletion,
  parentToAbsorbed,
  parentToElement,
  parentToLink,
  projectAt,
  rootHeadsOf,
  translateBetween,
  typeOfDoc,
} from './version-translation.ts';

//
// Objects a newer version extracts from an older one (`Lens.extract`/`Lens.extractEach`, DESIGN.md §12.10). An
// extracted object is an ordinary object: a random id, and a convergence key naming the lens, the parent, the
// property and, for a list, the element, so objects two devices extract concurrently merge into one. Its data
// converges by translation, not by the merge: each original edit reaches it from the document it was made in,
// an edit made in an object merged into it included.
//

const LINK_KEY_PREFIX = 'lens:';

/** The message of the change that writes references to extracted objects into the newer version. */
const linkMessage = (property: string): string => `lens-link ${property}`;

/** The message of the change that removes, from the older version, the elements of objects a newer version deleted. */
const unlinkMessage = (property: string): string => `lens-unlink ${property}`;

/**
 * The convergence key of the object `edge` extracts from `objectId` into `link.property`, or, for a list, from
 * its element `elementId`.
 */
export const linkConvergenceKey = (
  edge: Lens.VersionEdge,
  link: Lens.VersionLink,
  objectId: string,
  elementId?: string,
): string =>
  `${LINK_KEY_PREFIX}${hashOf(edge.digest)}:${objectId}:${link.property}${elementId === undefined ? '' : `:${elementId}`}`;

/** Whether a convergence key names an extracted object, whose data converges by translation rather than by merging. */
export const isLinkConvergenceKey = (key: string): boolean => key.startsWith(LINK_KEY_PREFIX);

/** A version document of the parent. */
export type LinkParent = { version: string; handle: VersionDocHandle };

type Linked = { objectId: string; handle: VersionDocHandle };

/** An extracted object that is not merged into another, and those merged into it. */
type Live = Linked & { key: string; deleted: boolean; merged: Linked[] };

const loadObject = async (store: VersionStore, objectId: string): Promise<VersionDocHandle | undefined> => {
  const url = store.root.doc().links?.[objectId];
  return url === undefined ? undefined : store.load(url.toString());
};

const idOf = (ref: unknown): EntityId | undefined => {
  const uri = isEncodedReference(ref) ? EID.tryParse(EncodedReference.toURI(ref)) : undefined;
  return uri && EID.getEntityId(uri);
};

const refTo = (objectId: string): EncodedReference => EncodedReference.fromURI(EID.make({ entityId: objectId }));

/** The extracted object `ref` names, followed through merges, if its convergence key is one `accept` takes. */
const linkedObject = async (
  store: VersionStore,
  ref: unknown,
  accept: (key: string) => boolean,
): Promise<Live | undefined> => {
  const seen = new Set<string>();
  for (let objectId = idOf(ref); objectId && !seen.has(objectId);) {
    seen.add(objectId);
    const handle = await loadObject(store, objectId);
    const entity = handle?.doc().objects?.[objectId];
    const key = entity?.meta?.convergenceKey;
    if (!handle || !entity || key === undefined || !accept(key)) {
      return undefined;
    }
    if (entity.system?.mergedInto === undefined) {
      const merged: Linked[] = [];
      for (const mergedId of entity.system?.mergedFrom ?? []) {
        const mergedHandle = await loadObject(store, mergedId);
        if (mergedHandle?.doc().objects?.[mergedId]) {
          merged.push({ objectId: mergedId, handle: mergedHandle });
        }
      }
      return { objectId, handle, key, deleted: entity.system?.deleted === true, merged };
    }
    objectId = entity.system.mergedInto;
  }
  return undefined;
};

/** Stores an extracted object derived from `parent` at `heads`, and links it from the space root. */
const createLinked = async (
  store: VersionStore,
  { parent, heads, link, key }: { parent: LinkParent; heads: readonly string[]; link: Lens.VersionLink; key: string },
  data: Record<string, unknown>,
): Promise<Live | undefined> => {
  const childId = EntityId.random();
  const handle = await store.create(
    deriveLinkDoc({
      parent: parent.handle.doc(),
      heads: [...heads],
      version: parent.version,
      type: link.child,
      childId,
      convergenceKey: key,
      data,
    }),
  );
  const url = handle.url;
  if (!url) {
    return undefined;
  }
  store.root.change((root) => {
    root.links ??= {};
    root.links[childId] = new A.RawString(url);
  });
  return { objectId: childId, handle, key, deleted: false, merged: [] };
};

type Side = Linked & { label: string; roots?: ReadonlySet<string> };

type Pair = { source: Side; target: Side; project: Projection };

export type SyncLinksOptions = {
  store: VersionStore;
  edges: readonly Lens.VersionEdge[];
  objectId: string;
  typename: string;
  parents: ReadonlyMap<string, LinkParent>;
  settled: Set<string> | undefined;
  onHandle?: (objectId: string, handle: VersionDocHandle) => void;
};

/**
 * Extracts every object the lenses between the held versions of `objectId` call for, and translates between
 * each one and the versions it was extracted from, and from the objects merged into it, until a round writes
 * nothing.
 */
export const syncLinks = async (options: SyncLinksOptions): Promise<void> => {
  const { edges, typename, parents } = options;
  for (const edge of edges) {
    const older = parents.get(edge.from);
    const newer = parents.get(edge.to);
    if (edge.typename !== typename || !older || !newer) {
      continue;
    }
    for (const link of edge.links) {
      const context = { ...options, edge, link, older, newer };
      switch (link.shape) {
        case 'struct':
          await syncStruct(context);
          break;
        case 'each':
          await syncEach(context);
          break;
        case 'absorb':
          await syncAbsorb(context);
          break;
      }
    }
  }
};

type LinkContext = SyncLinksOptions & {
  edge: Lens.VersionEdge;
  link: Lens.VersionLink;
  older: LinkParent;
  newer: LinkParent;
};

/**
 * A struct extracted into one object, created from the older version's root. The reference is written by a
 * change whose message marks the property as extracted, so a reference an app later removes is not extracted
 * again.
 */
const syncStruct = async ({
  store,
  edges,
  objectId,
  parents,
  settled,
  onHandle,
  edge,
  link,
  older,
  newer,
}: LinkContext): Promise<void> => {
  const key = linkConvergenceKey(edge, link, objectId);
  const refOf = () => newer.handle.doc().objects?.[objectId]?.data?.[link.property];
  const extracted = A.getChangesMetaSince(newer.handle.doc(), []).some(
    (change) => change.message === linkMessage(link.property),
  );
  if (refOf() === undefined && !extracted) {
    const heads = rootHeadsOf(older.handle.doc(), objectId);
    const [data] = projectAt(
      older.handle.doc(),
      heads,
      objectId,
      parentToLink({ edges, edge, link, version: older.version }),
    );
    const created = await createLinked(store, { parent: older, heads, link, key }, data.value ?? {});
    if (created) {
      newer.handle.change(
        (doc) => {
          const data = doc.objects?.[objectId]?.data;
          if (data) {
            data[link.property] = refTo(created.objectId);
          }
        },
        { message: linkMessage(link.property) },
      );
    }
  }
  const child = await linkedObject(store, refOf(), (candidate) => candidate === key);
  if (!child) {
    if (refOf() !== undefined) {
      log('version documents: a reference to an extracted object names another object', {
        objectId,
        property: link.property,
      });
    }
    return;
  }

  const target: Side = { ...child, label: child.objectId };
  const merged = child.merged.map((linked): Side => ({ ...linked, label: linked.objectId }));
  const pairs: Pair[] = merged.map((source) => ({ source, target, project: dataOf }));
  for (const { version, handle } of parents.values()) {
    const parent: Side = { objectId, handle, label: version };
    pairs.push({ source: parent, target, project: parentToLink({ edges, edge, link, version }) });
    const back = linkToParent({ edges, edge, link, version });
    if (back) {
      pairs.push(...[target, ...merged].map((source) => ({ source, target: parent, project: back })));
    }
  }
  for (const linked of [child, ...child.merged]) {
    onHandle?.(objectId, linked.handle);
  }
  translatePairs(pairs, settled);
};

/**
 * The change that inserted the map `elementId`: the last change of the op's actor starting at or below its counter
 * (an empty change shares its successor's start).
 */
const insertionOf = (doc: VersionDoc, elementId: string): string | undefined => {
  const [counter, actor] = elementId.split('@');
  const op = Number(counter);
  let found: A.ChangeMetadata | undefined;
  for (const change of A.getChangesMetaSince(doc, [])) {
    if (change.actor === actor && change.startOp <= op && (!found || change.seq > found.seq)) {
      found = change;
    }
  }
  return found?.hash;
};

/**
 * Each element of a list of structs extracted into an object of its own, identified by the element's map, which
 * a reorder replaces. Each object is created from the older version as the change that inserted its element
 * left it, so every device creates the same one; the newer version's list of references follows the older
 * version's order, and an object a newer version deletes takes its element with it.
 */
const syncEach = async ({
  store,
  edges,
  objectId,
  typename,
  parents,
  settled,
  onHandle,
  edge,
  link,
  older,
  newer,
}: LinkContext): Promise<void> => {
  // Element identity is local to the older version's document: a version older still could not follow it.
  if (Lens.versionsOf(edges, typename)[0] !== edge.from) {
    log.warn('version documents: a list is extracted from a version that is not the oldest', {
      objectId,
      property: link.property,
    });
    return;
  }
  const prefix = `${linkConvergenceKey(edge, link, objectId)}:`;
  const listPath = ['objects', objectId, 'data', link.from];
  const elementsOf = (): string[] => {
    const list = getDeep(older.handle.doc(), listPath);
    return (Array.isArray(list) ? list : []).flatMap((item) => {
      const id = isRecord(item) ? A.getObjectId(item) : null;
      return id === null ? [] : [id];
    });
  };

  const children = new Map<string, Live>();
  const refs = newer.handle.doc().objects?.[objectId]?.data?.[link.property];
  for (const ref of Array.isArray(refs) ? refs : []) {
    const child = await linkedObject(store, ref, (key) => key.startsWith(prefix));
    const elementId = child?.key.slice(prefix.length);
    if (child && elementId && !children.has(elementId)) {
      children.set(elementId, child);
    }
  }

  // An object the newer version deleted takes its element with it, unless the whole parent was deleted.
  const parentDeleted = older.handle.doc().objects?.[objectId]?.system?.deleted === true;
  const elements = new Set(elementsOf());
  const unlinked = new Set(
    [...children].filter(([elementId, child]) => child.deleted && elements.has(elementId)).map(([id]) => id),
  );
  if (unlinked.size > 0 && !parentDeleted) {
    older.handle.change(
      (doc) => {
        const list = getDeep(doc, listPath);
        if (Array.isArray(list)) {
          for (let index = list.length - 1; index >= 0; index--) {
            const item = list[index];
            if (isRecord(item) && unlinked.has(A.getObjectId(item) ?? '')) {
              list.splice(index, 1);
            }
          }
        }
      },
      { message: unlinkMessage(link.property) },
    );
  }

  for (const elementId of elementsOf()) {
    const insertion = insertionOf(older.handle.doc(), elementId);
    if (children.has(elementId) || !insertion) {
      continue;
    }
    const [data] = projectAt(older.handle.doc(), [insertion], objectId, parentToElement({ link, objectId, elementId }));
    const key = `${prefix}${elementId}`;
    const created =
      data.value && (await createLinked(store, { parent: older, heads: [insertion], link, key }, data.value));
    if (created) {
      children.set(elementId, created);
    }
  }

  syncReferences(
    newer,
    objectId,
    link.property,
    elementsOf().flatMap((elementId) => {
      const child = children.get(elementId);
      return child && !child.deleted ? [child.objectId] : [];
    }),
  );

  const olderGraph = changeGraphOf(older.handle.doc());
  const pairs: Pair[] = [];
  for (const [elementId, child] of children) {
    const roots = ancestorsOf(olderGraph, linkRootOf(child.handle.doc())?.heads ?? []);
    const parent: Side = { objectId, handle: older.handle, label: older.version, roots };
    const target: Side = { ...child, label: child.objectId };
    const merged = child.merged.map((linked): Side => ({ ...linked, label: linked.objectId }));
    const toParent = elementToParent({ link, objectId, elementId });
    pairs.push(
      { source: parent, target, project: parentToElement({ link, objectId, elementId }) },
      ...[target, ...merged].map((source) => ({ source, target: parent, project: toParent })),
      ...merged.map((source) => ({ source, target, project: dataOf })),
    );
    for (const { version, handle } of parents.values()) {
      if (version !== older.version) {
        pairs.push({ source: { objectId, handle, label: version }, target, project: parentDeletion });
      }
    }
    for (const linked of [child, ...child.merged]) {
      onHandle?.(objectId, linked.handle);
    }
  }
  translatePairs(pairs, settled);
};

/**
 * The objects the origin version of `objectId` referenced when it was created, which newer versions absorb, or
 * `undefined` while one of them is not available: a root derived without it would differ from every other
 * device's.
 */
export const absorbedOf = async (
  store: VersionStore,
  edges: readonly Lens.VersionEdge[],
  typename: string,
  objectId: string,
  origin: LinkParent,
): Promise<Absorbed[] | undefined> => {
  const created = creationOf(origin.handle.doc(), objectId);
  const absorbed: Absorbed[] = [];
  for (const edge of edges) {
    const path = Lens.versionPath(edges, typename, origin.version, edge.from);
    for (const link of edge.typename === typename && path ? edge.links : []) {
      const absorbedId = link.shape === 'absorb' && created ? idOf(path?.apply(created.data)[link.from]) : undefined;
      if (!absorbedId) {
        continue;
      }
      const handle = await loadObject(store, absorbedId);
      const child = handle && creationOf(handle.doc(), absorbedId);
      if (!child) {
        return undefined;
      }
      absorbed.push({ edge, link, objectId: absorbedId, ...child });
    }
  }
  return absorbed;
};

/**
 * A struct a newer version absorbs from the object the older version referenced at its root, which every
 * version embedding the struct also stands for. A reference repointed later is logged, not followed: the copy
 * keeps following the object it started from. Copies other parents absorbed from the same object receive this
 * parent's edits directly, through the object's mapping.
 */
const syncAbsorb = async ({
  store,
  edges,
  objectId,
  typename,
  parents,
  settled,
  onHandle,
  edge,
  link,
  older,
  newer,
}: LinkContext): Promise<void> => {
  const origin = absorbedOriginsOf(newer.handle.doc()).find(({ property }) => property === link.property);
  const handle = origin && (await loadObject(store, origin.objectId));
  if (!origin || !handle) {
    return;
  }
  if (idOf(older.handle.doc().objects?.[objectId]?.data?.[link.from]) !== origin.objectId) {
    log('version documents: an absorbed reference was repointed; the struct keeps following its object', {
      objectId,
      property: link.property,
    });
  }
  const absorbed: Side = { objectId: origin.objectId, handle, label: origin.objectId };
  const embedding = [...parents.values()]
    .filter(({ version }) => Lens.compareVersions(version, edge.to) >= 0)
    .map(({ version, handle }) => ({ version, side: { objectId, handle, label: `${objectId}:${version}` } }));
  const pairs: Pair[] = embedding.flatMap(({ version, side }) => [
    { source: absorbed, target: side, project: absorbedToParent({ edges, edge, link, version }) },
    { source: side, target: absorbed, project: parentToAbsorbed({ edges, edge, link, version }) },
  ]);
  onHandle?.(objectId, handle);

  for (const sibling of (await store.referrers?.(origin.objectId)) ?? []) {
    if (sibling === objectId) {
      continue;
    }
    for (const [version, url] of Object.entries(DatabaseDirectory.getVersionDocUrls(store.root.doc(), sibling))) {
      if (Lens.compareVersions(version, edge.to) < 0) {
        continue;
      }
      const copy = await store.load(url.toString());
      const shared = absorbedOriginsOf(copy.doc()).some(
        (candidate) => candidate.property === link.property && candidate.objectId === origin.objectId,
      );
      if (!shared || typeOfDoc(copy.doc(), sibling, edges)?.typename !== typename) {
        continue;
      }
      const target: Side = { objectId: sibling, handle: copy, label: `${sibling}:${version}` };
      const into = absorbedToParent({ edges, edge, link, version });
      pairs.push(
        ...embedding.map(({ version: from, side }) => ({
          source: side,
          target,
          project: absorbedCopy(into, parentToAbsorbed({ edges, edge, link, version: from })),
        })),
      );
      onHandle?.(objectId, copy);
    }
  }
  translatePairs(pairs, settled);
};

/**
 * Makes the newer version's list of references name `desired`, in order: references already in order stay,
 * others are removed, and the missing ones are inserted where they belong.
 */
const syncReferences = (newer: LinkParent, objectId: string, property: string, desired: readonly string[]): void => {
  const current = newer.handle.doc().objects?.[objectId]?.data?.[property];
  if (Array.isArray(current) && current.map(idOf).join() === desired.join()) {
    return;
  }
  newer.handle.change(
    (doc) => {
      const data = doc.objects?.[objectId]?.data;
      if (!data) {
        return;
      }
      if (!Array.isArray(data[property])) {
        data[property] = desired.map(refTo);
        return;
      }
      const list: unknown[] = data[property];
      let next = 0;
      for (let index = 0; index < list.length;) {
        const found = desired.indexOf(idOf(list[index]) ?? '', next);
        if (found < 0) {
          list.splice(index, 1);
          continue;
        }
        list.splice(index, 0, ...desired.slice(next, found).map(refTo));
        index += found - next + 1;
        next = found + 1;
      }
      list.push(...desired.slice(next).map(refTo));
    },
    { message: linkMessage(property) },
  );
};

/** Translates along every pair until a round writes nothing. */
const translatePairs = (pairs: readonly Pair[], settled: Set<string> | undefined): void => {
  for (let round = 0; round < pairs.length + 1; round++) {
    let written = false;
    for (const { source, target, project } of pairs) {
      const before: VersionDoc = target.handle.doc();
      const next = translateBetween({
        source: { doc: source.handle.doc(), objectId: source.objectId, label: source.label, roots: source.roots },
        target: { doc: before, objectId: target.objectId, label: target.label, roots: target.roots },
        project,
        settled,
      });
      if (next !== before) {
        target.handle.update((doc) => A.merge(doc, next));
        written = true;
      }
    }
    if (!written) {
      return;
    }
  }
};
