//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { Lens } from '@dxos/echo';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { log } from '@dxos/log';

import { isRecord } from './encoded-value.ts';
import { absorbedOf, syncLinks } from './version-links.ts';
import {
  type VersionDoc,
  derivedWith,
  deriveVersionDoc,
  isDerived,
  translate,
  typeOfDoc,
  versionOfDoc,
} from './version-translation.ts';

//
// Keeps every version document of each versioned object present and in sync (DESIGN.md §12.5):
// - `links[objectId]` keeps pointing at the document released apps read; every other version is
//   recorded as `branches[objectId]['@v<version>']`, which released hosts replicate and never load as
//   an object.
// - A missing version is derived from the object's origin document, so devices that create it
//   concurrently create the same root under different document ids. The registry's visible value wins;
//   a device holding a losing document merges it into the winner.
// - Every original edit is translated into every other version this device holds, and between the versions
//   embedding a struct and the object a newer version extracts it into (`version-links.ts`).
//

/** A document the runner reads and writes. */
export type VersionDocHandle = {
  readonly url: string | undefined;
  doc(): VersionDoc;
  change(callback: A.ChangeFn<DatabaseDirectory>, options?: A.ChangeOptions<DatabaseDirectory>): void;
  /** Replaces the document with one built from it, as `A.merge` returns. */
  update(callback: (doc: VersionDoc) => VersionDoc): void;
};

/** Where the runner finds, creates and records an object's version documents. */
export type VersionStore = {
  /** The space root document, which holds `links` and the branch registry. */
  readonly root: VersionDocHandle;
  load(url: string): Promise<VersionDocHandle>;
  /** The document `links` names for `objectId`, read through the store so a caller can see which objects a pass depended on. */
  link(objectId: string): string | undefined;
  /** Stores `doc` as a new document. */
  create(doc: VersionDoc): Promise<VersionDocHandle>;
  /** The objects whose documents reference `objectId`; without it, copies of a shared absorbed object do not exchange edits. */
  referrers?(objectId: string): Promise<readonly string[]>;
};

/** Per-object memory of edits already handled, so each is examined once per target. */
export type VersionSettled = Map<string, Set<string>>;

export type SyncVersionsOptions = {
  /** The objects to sync; every object of a versioned type when absent. */
  objectIds?: Iterable<string>;
  settled?: VersionSettled;
  /** Receives every version document handle the pass loaded, to watch for further edits. */
  onHandle?: (objectId: string, handle: VersionDocHandle) => void;
};

type Held = { version: string; handle: VersionDocHandle };

type Alternative = {
  value: unknown;
  /** Whether `value` is part of the document tree; a hidden conflict value is a detached copy. */
  live: boolean;
};

/** Every value `parent[key]` holds, including those a concurrent write hides. */
const alternatives = ({ value: parent, live }: Alternative, key: string): Alternative[] => {
  if (!isRecord(parent) || parent[key] === undefined) {
    return [];
  }
  const visible = { value: parent[key], live };
  const conflicts = live ? A.getConflicts(parent, key) : undefined;
  if (!conflicts) {
    return [visible];
  }
  const visibleId = A.getObjectId(parent, key);
  return [
    visible,
    ...Object.entries(conflicts)
      .filter(([opId]) => opId !== visibleId)
      .map(([, value]) => ({ value, live: false })),
  ];
};

/** The values along `path` from `root`, a live document value, through every alternative at each step. */
const alternativesAlong = (root: unknown, path: readonly string[]): unknown[] =>
  path
    .reduce<Alternative[]>(
      (level, key) => level.flatMap((alternative) => alternatives(alternative, key)),
      [{ value: root, live: true }],
    )
    .map(({ value }) => value);

/** Every document url recorded for `objectId` at reserved branch `name`, visible first. */
const candidatesOf = (root: DatabaseDirectory, objectId: string, name: string): string[] => {
  const urls = new Set<string>();
  const visible = root.branches?.[objectId]?.[name]?.members?.[objectId];
  if (visible != null) {
    urls.add(visible.toString());
  }
  for (const url of alternativesAlong(root, ['branches', objectId, name, 'members', objectId])) {
    urls.add(String(url));
  }
  return [...urls];
};

/** Every reserved version name recorded for `objectId`, including those a concurrent write hides. */
const recordedVersions = (root: DatabaseDirectory, objectId: string): Set<string> => {
  const versions = new Set<string>();
  for (const byName of alternativesAlong(root, ['branches', objectId])) {
    for (const name of isRecord(byName) ? Object.keys(byName) : []) {
      const version = DatabaseDirectory.parseVersionBranch(name);
      if (version !== undefined) {
        versions.add(version);
      }
    }
  }
  return versions;
};

/** Merges every duplicate document into `winner`: both share the same root, so the result is their union. */
const mergeLosers = async (
  store: VersionStore,
  winner: VersionDocHandle,
  losers: readonly string[],
  accept: (doc: VersionDoc) => boolean = () => true,
): Promise<void> => {
  for (const url of losers) {
    const loser = await store.load(url);
    if (accept(loser.doc()) && !A.hasHeads(winner.doc(), A.getHeads(loser.doc()))) {
      winner.update((doc) => A.merge(doc, loser.doc()));
    }
  }
};

const register = (store: VersionStore, objectId: string, version: string, url: string, type: string): void => {
  store.root.change((doc: DatabaseDirectory) => {
    // Assign through re-read proxies: a chained `??=` result is a detached literal under Automerge.
    doc.branches ??= {};
    doc.branches[objectId] ??= {};
    doc.branches[objectId][DatabaseDirectory.versionBranchName(version)] = {
      members: { [objectId]: new A.RawString(url) },
      type,
    };
  });
};

/**
 * One pass over `objectIds`: creates every missing version document, merges duplicates into the
 * registry's winner, and translates edits between the versions until none is left. Returns the objects
 * the pass could not sync, which a caller retries.
 */
export const syncVersionDocuments = async (
  store: VersionStore,
  edges: readonly Lens.VersionEdge[],
  objectIds: Iterable<string>,
  options: Omit<SyncVersionsOptions, 'objectIds'> = {},
): Promise<string[]> => {
  // Derived roots follow the order of the lenses, and every device must derive the same root whatever order its
  // index lists them in.
  const ordered = [...edges].sort((one, two) => one.digest.localeCompare(two.digest));
  const failed: string[] = [];
  for (const objectId of objectIds) {
    try {
      await syncObject(store, ordered, objectId, options);
    } catch (err) {
      log.warn('version documents: could not sync object', { objectId, err });
      failed.push(objectId);
    }
  }
  return failed;
};

const syncObject = async (
  store: VersionStore,
  allEdges: readonly Lens.VersionEdge[],
  objectId: string,
  { settled, onHandle }: Omit<SyncVersionsOptions, 'objectIds'>,
): Promise<void> => {
  const root = store.root;
  const [legacyUrl, ...legacyLosers] = [
    ...new Set(alternativesAlong(root.doc(), ['links', objectId]).map((url) => String(url))),
  ];
  if (!legacyUrl) {
    // Inline objects share the space root and have no document of their own to version.
    return;
  }
  const legacy = await store.load(legacyUrl);
  const legacyType = typeOfDoc(legacy.doc(), objectId, allEdges);
  if (!legacyType) {
    return;
  }
  const { version: legacyVersion, typename } = legacyType;
  const conflicted = conflictedOf(allEdges, typename);
  const typeOf = (version: string): string | undefined => Lens.typeOfVersion(allEdges, typename, version);
  await mergeLosers(store, legacy, legacyLosers, (doc) => versionOfDoc(doc, objectId, allEdges) === legacyVersion);
  const held = new Map<string, Held>([[legacyVersion, { version: legacyVersion, handle: legacy }]]);
  // The registry lists every version, the linked one included, so a reader can pick among them unloaded.
  if (DatabaseDirectory.getVersionDocUrls(root.doc(), objectId)[legacyVersion] !== legacyUrl) {
    register(store, objectId, legacyVersion, legacyUrl, legacyType.uri);
  }

  // Recorded versions: load the winner and fold every losing duplicate into it.
  for (const version of recordedVersions(root.doc(), objectId)) {
    const [winnerUrl, ...losers] = candidatesOf(root.doc(), objectId, DatabaseDirectory.versionBranchName(version));
    if (!winnerUrl || version === legacyVersion) {
      continue;
    }
    const winner = await store.load(winnerUrl);
    await mergeLosers(store, winner, losers);
    held.set(version, { version, handle: winner });
    // A version recorded only inside a map a concurrent write hid has no visible entry; record it again.
    const type = typeOf(version);
    if (!DatabaseDirectory.getVersionDocUrls(root.doc(), objectId)[version] && type) {
      register(store, objectId, version, winnerUrl, type);
    }
  }

  // A pair with two different stored lenses derives no new versions; held documents translate with the
  // lenses their roots were derived with.
  const edges = designatedEdges(allEdges, typename, [...held.values()]);
  if (!edges) {
    log.warn('version documents: no stored lenses match the roots of the held versions', { objectId, typename });
    return;
  }

  // Missing versions are derived from the origin: the document the app created the object in.
  const origin = [...held.values()].find(({ handle }) => !isDerived(handle.doc()));
  for (const version of conflicted.size > 0 ? [] : Lens.versionsOf(edges, typename)) {
    const type = typeOf(version);
    if (held.has(version) || !origin || !type) {
      continue;
    }
    const handle = await derive(store, origin, version, objectId, typename, edges);
    if (!handle?.url) {
      continue;
    }
    register(store, objectId, version, handle.url, type);
    held.set(version, { version, handle });
  }

  // Released apps follow only `links`, so it names the oldest version, including for an object an app
  // created at a newer one.
  const [oldest] = Lens.versionsOf(edges, typename);
  const oldestUrl = held.get(oldest)?.handle.url;
  if (oldest !== legacyVersion && oldestUrl) {
    root.change((doc: DatabaseDirectory) => {
      doc.links ??= {};
      doc.links[objectId] = new A.RawString(oldestUrl);
    });
  }

  for (const { handle } of held.values()) {
    onHandle?.(objectId, handle);
  }

  translateAll([...held.values()], objectId, typename, edges, settledFor(settled, objectId));
  await syncLinks({
    store,
    edges,
    objectId,
    typename,
    parents: held,
    settled: settledFor(settled, `${objectId} links`),
    onHandle,
  });
  await syncBranches(store, edges, conflicted.size > 0, objectId, typename, origin, { settled, onHandle });
};

/** The names of the pairs of versions of `typename` with more than one stored lens. */
const conflictedOf = (edges: readonly Lens.VersionEdge[], typename: string): Set<string> => {
  const digests = new Map<string, Set<string>>();
  for (const edge of edges.filter((candidate) => candidate.typename === typename)) {
    digests.set(edge.name, (digests.get(edge.name) ?? new Set()).add(edge.digest));
  }
  return new Set([...digests].filter(([, set]) => set.size > 1).map(([name]) => name));
};

/**
 * One lens per pair: where a pair has several, the choice every held derived document was derived with,
 * or `undefined` when no choice fits them all.
 */
const designatedEdges = (
  edges: readonly Lens.VersionEdge[],
  typename: string,
  held: readonly Held[],
): Lens.VersionEdge[] | undefined => {
  const byName = new Map<string, Lens.VersionEdge[]>();
  for (const edge of edges.filter((candidate) => candidate.typename === typename)) {
    byName.set(edge.name, [...(byName.get(edge.name) ?? []), edge]);
  }
  const choices = [...byName.values()].reduce<Lens.VersionEdge[][]>(
    (combinations, variants) =>
      combinations.flatMap((combination) => variants.map((variant) => [...combination, variant])),
    [[]],
  );
  return choices.find((choice) => held.every(({ handle }) => derivedWith(handle.doc(), choice, typename)));
};

/**
 * Stores the document for `version` derived from `origin`, or nothing while an object a struct of it absorbs is
 * not available.
 */
const derive = async (
  store: VersionStore,
  origin: Held,
  version: string,
  objectId: string,
  typename: string,
  edges: readonly Lens.VersionEdge[],
): Promise<VersionDocHandle | undefined> => {
  const absorbed = await absorbedOf(store, edges, typename, objectId, origin);
  if (!absorbed) {
    log('version documents: an absorbed object is not available yet', { objectId, version });
    return undefined;
  }
  const derived = deriveVersionDoc({
    origin: origin.handle.doc(),
    originVersion: origin.version,
    version,
    objectId,
    typename,
    edges,
    absorbed,
  });
  return derived && store.create(derived);
};

/** The edits already handled for one set of version documents, kept across passes. */
const settledFor = (settled: VersionSettled | undefined, key: string): Set<string> | undefined => {
  let set = settled?.get(key);
  if (settled && !set) {
    set = new Set();
    settled.set(key, set);
  }
  return set;
};

/**
 * Keeps the versions of the object on every user branch holding it as main's are kept: a branch opened
 * before an upgrade gains the new versions, derived from the object's origin, so they share main's roots
 * and merge back version by version; edits are translated among the branch's own documents.
 */
const syncBranches = async (
  store: VersionStore,
  edges: readonly Lens.VersionEdge[],
  conflicted: boolean,
  objectId: string,
  typename: string,
  origin: Held | undefined,
  { settled, onHandle }: Omit<SyncVersionsOptions, 'objectIds'>,
): Promise<void> => {
  const root = store.root;
  for (const [rootId, byName] of Object.entries(root.doc().branches ?? {})) {
    for (const [name, record] of Object.entries(byName)) {
      const memberUrl = record.members?.[objectId]?.toString();
      if (DatabaseDirectory.isReservedBranchName(name) || !memberUrl) {
        continue;
      }
      const member = await store.load(memberUrl);
      const memberVersion = versionOfDoc(member.doc(), objectId, edges);
      if (!memberVersion) {
        continue;
      }
      const held = new Map<string, Held>([[memberVersion, { version: memberVersion, handle: member }]]);
      // As on main: the visible document of each version wins, and every duplicate a concurrent write hid merges into it.
      // From the visible record: a hidden value above it is another device's branch of the same name, not a duplicate.
      const visible = root.doc().branches?.[rootId]?.[name];
      const path = ['versions', objectId];
      const versions = new Set(
        alternativesAlong(visible, path).flatMap((byVersion) => (isRecord(byVersion) ? Object.keys(byVersion) : [])),
      );
      for (const version of versions) {
        const [winnerUrl, ...losers] = [...new Set(alternativesAlong(visible, [...path, version]).map(String))];
        if (!winnerUrl) {
          continue;
        }
        const winner = await store.load(winnerUrl);
        await mergeLosers(store, winner, losers);
        held.set(version, { version, handle: winner });
        if (record.versions?.[objectId]?.[version]?.toString() !== winnerUrl) {
          recordBranchVersion(root, rootId, name, objectId, version, winnerUrl);
        }
      }
      for (const version of conflicted ? [] : Lens.versionsOf(edges, typename)) {
        if (held.has(version) || !origin) {
          continue;
        }
        const handle = await derive(store, origin, version, objectId, typename, edges);
        const url = handle?.url;
        if (!handle || !url) {
          continue;
        }
        recordBranchVersion(root, rootId, name, objectId, version, url);
        held.set(version, { version, handle });
      }
      for (const { handle } of held.values()) {
        onHandle?.(objectId, handle);
      }
      translateAll([...held.values()], objectId, typename, edges, settledFor(settled, `${objectId} ${rootId}/${name}`));
    }
  }
};

/** Records `url` as branch `name`'s document for `version` of `objectId`. */
const recordBranchVersion = (
  root: VersionDocHandle,
  rootId: string,
  name: string,
  objectId: string,
  version: string,
  url: string,
): void => {
  root.change((doc: DatabaseDirectory) => {
    const branch = doc.branches?.[rootId]?.[name];
    if (branch) {
      branch.versions ??= {};
      branch.versions[objectId] ??= {};
      branch.versions[objectId][version] = new A.RawString(url);
    }
  });
};

/** Translates between every pair of held versions until a round writes nothing. */
const translateAll = (
  held: readonly Held[],
  objectId: string,
  typename: string,
  edges: readonly Lens.VersionEdge[],
  settled: Set<string> | undefined,
): void => {
  for (let round = 0; round < held.length + 1; round++) {
    let written = false;
    for (const source of held) {
      for (const target of held) {
        if (source === target) {
          continue;
        }
        const before: VersionDoc = target.handle.doc();
        const next = translate({
          source: { doc: source.handle.doc(), version: source.version },
          target: { doc: before, version: target.version },
          objectId,
          typename,
          edges,
          settled,
        });
        if (next !== before) {
          target.handle.update((doc) => A.merge(doc, next));
          written = true;
        }
      }
    }
    if (!written) {
      return;
    }
  }
};
