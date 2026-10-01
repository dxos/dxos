//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { type Lens } from '@dxos/echo';
import { EncodedReference, isEncodedReference } from '@dxos/echo-protocol';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';

import { isRecord } from './encoded-value.ts';
import { type VersionDocHandle, type VersionStore } from './version-runner.ts';
import {
  type Section,
  type VersionDoc,
  dataOf,
  deriveLinkDoc,
  hashOf,
  linkToParent,
  parentToLink,
  translateBetween,
} from './version-translation.ts';

//
// Objects a newer version extracts from an older one (`Lens.extract`, DESIGN.md §12.10). An extracted object
// is an ordinary object: a random id, and a convergence key naming the lens, the parent and the property, so
// objects two devices extract concurrently merge into one. Its data converges by translation, not by the
// merge: each original edit reaches it from the document it was made in, an edit made in an object merged
// into it included.
//

const LINK_KEY_PREFIX = 'lens:';

/** The message of the change that writes the reference to an extracted object into the newer version. */
const linkMessage = (property: string): string => `lens-link ${property}`;

/** The convergence key of the object `edge` extracts from `objectId` into `link.property`. */
export const linkConvergenceKey = (edge: Lens.VersionEdge, link: Lens.VersionLink, objectId: string): string =>
  `${LINK_KEY_PREFIX}${hashOf(edge.digest)}:${objectId}:${link.property}`;

/** Whether a convergence key names an extracted object, whose data converges by translation rather than by merging. */
export const isLinkConvergenceKey = (key: string): boolean => key.startsWith(LINK_KEY_PREFIX);

/** A version document of the parent. */
export type LinkParent = { version: string; handle: VersionDocHandle };

type Linked = { objectId: string; handle: VersionDocHandle };

/** The extracted object `ref` names, followed through merges, if it is the one `convergenceKey` names. */
const linkedObject = async (
  store: VersionStore,
  ref: unknown,
  convergenceKey: string,
): Promise<(Linked & { mergedFrom: readonly string[] }) | undefined> => {
  const uri = isEncodedReference(ref) ? EID.tryParse(EncodedReference.toURI(ref)) : undefined;
  const seen = new Set<string>();
  for (let objectId = uri && EID.getEntityId(uri); objectId && !seen.has(objectId);) {
    seen.add(objectId);
    const handle = await loadObject(store, objectId);
    const entity = handle?.doc().objects?.[objectId];
    if (!handle || !entity || entity.meta?.convergenceKey !== convergenceKey) {
      return undefined;
    }
    if (entity.system?.mergedInto === undefined) {
      return { objectId, handle, mergedFrom: entity.system?.mergedFrom ?? [] };
    }
    objectId = entity.system.mergedInto;
  }
  return undefined;
};

const loadObject = async (store: VersionStore, objectId: string): Promise<VersionDocHandle | undefined> => {
  const url = store.root.doc().links?.[objectId];
  return url === undefined ? undefined : store.load(url.toString());
};

/**
 * Creates the object `link` extracts, from the older version's root, and records it: linked from the space
 * root, and referenced from the newer version by a change whose message marks the property as extracted, so
 * a reference an app later removes is not extracted again.
 */
const extract = async (
  store: VersionStore,
  edges: readonly Lens.VersionEdge[],
  edge: Lens.VersionEdge,
  link: Lens.VersionLink,
  objectId: string,
  older: LinkParent,
  newer: LinkParent,
): Promise<void> => {
  const childId = EntityId.random();
  const doc = deriveLinkDoc({
    parent: older.handle.doc(),
    objectId,
    version: older.version,
    edges,
    edge,
    link,
    childId,
    convergenceKey: linkConvergenceKey(edge, link, objectId),
  });
  const handle = doc && (await store.create(doc));
  const url = handle?.url;
  if (!url) {
    return;
  }
  store.root.change((root) => {
    root.links ??= {};
    root.links[childId] = new A.RawString(url);
  });
  newer.handle.change(
    (version) => {
      const data = version.objects?.[objectId]?.data;
      if (data) {
        data[link.property] = EncodedReference.fromURI(EID.make({ entityId: childId }));
      }
    },
    { message: linkMessage(link.property) },
  );
};

type Pair = {
  source: Linked & { label: string };
  target: Linked & { label: string };
  project: (entry: Record<string, unknown> | undefined) => Section[];
};

/**
 * Extracts every object the lenses between the held versions of `objectId` call for, and translates between
 * each one and the versions embedding its struct, and from the objects merged into it, until a round writes
 * nothing.
 */
export const syncLinks = async ({
  store,
  edges,
  objectId,
  typename,
  parents,
  settled,
  onHandle,
}: {
  store: VersionStore;
  edges: readonly Lens.VersionEdge[];
  objectId: string;
  typename: string;
  parents: ReadonlyMap<string, LinkParent>;
  settled: Set<string> | undefined;
  onHandle?: (objectId: string, handle: VersionDocHandle) => void;
}): Promise<void> => {
  for (const edge of edges) {
    const older = parents.get(edge.from);
    const newer = parents.get(edge.to);
    if (edge.typename !== typename || !older || !newer) {
      continue;
    }
    for (const link of edge.links) {
      const convergenceKey = linkConvergenceKey(edge, link, objectId);
      const ref = newer.handle.doc().objects?.[objectId]?.data?.[link.property];
      if (ref === undefined) {
        const extracted = A.getChangesMetaSince(newer.handle.doc(), []).some(
          (change) => change.message === linkMessage(link.property),
        );
        if (!extracted) {
          await extract(store, edges, edge, link, objectId, older, newer);
        }
      }
      const child = await linkedObject(
        store,
        newer.handle.doc().objects?.[objectId]?.data?.[link.property],
        convergenceKey,
      );
      if (!child) {
        if (ref !== undefined) {
          log('version documents: a reference to an extracted object names another object', {
            objectId,
            property: link.property,
          });
        }
        continue;
      }
      const merged: Linked[] = [];
      for (const mergedId of child.mergedFrom) {
        const handle = await loadObject(store, mergedId);
        if (handle && isRecord(handle.doc().objects?.[mergedId])) {
          merged.push({ objectId: mergedId, handle });
        }
      }
      for (const linked of [child, ...merged]) {
        onHandle?.(objectId, linked.handle);
      }

      const pairs: Pair[] = [];
      const target = { ...child, label: child.objectId };
      for (const { objectId: mergedId, handle } of merged) {
        pairs.push({ source: { objectId: mergedId, handle, label: mergedId }, target, project: dataOf });
      }
      for (const { version, handle } of parents.values()) {
        const parent = { objectId, handle, label: version };
        pairs.push({ source: parent, target, project: parentToLink({ edges, edge, link, version }) });
        const back = linkToParent({ edges, edge, link, version });
        if (back) {
          for (const source of [target, ...merged.map((linked) => ({ ...linked, label: linked.objectId }))]) {
            pairs.push({ source, target: parent, project: back });
          }
        }
      }
      translatePairs(pairs, settled);
    }
  }
};

/** Translates along every pair until a round writes nothing. */
const translatePairs = (pairs: readonly Pair[], settled: Set<string> | undefined): void => {
  for (let round = 0; round < pairs.length + 1; round++) {
    let written = false;
    for (const { source, target, project } of pairs) {
      const before: VersionDoc = target.handle.doc();
      const next = translateBetween({
        source: { doc: source.handle.doc(), objectId: source.objectId, label: source.label },
        target: { doc: before, objectId: target.objectId, label: target.label },
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
