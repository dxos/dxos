//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { VersionLens } from '@dxos/echo';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { log } from '@dxos/log';

import { type DocHandleProxy, type RepoProxy } from '../../automerge/index.ts';
import { isRecord } from '../encoded-value.ts';
import { type VersionDoc, deriveVersionDoc, isDerived, translate, versionOfDoc } from './version-translation.ts';

//
// Keeps every version document of each versioned object present and in sync (DESIGN.md §12.5):
// - `links[objectId]` keeps pointing at the document released apps read; every other version is
//   recorded as `branches[objectId]['@v<version>']`, which released hosts replicate and never load as
//   an object.
// - A missing version is derived from the object's origin document, so devices that create it
//   concurrently create the same root under different document ids. The registry's visible value wins;
//   a device holding a losing document merges it into the winner.
// - Every original edit is translated into every other version this device holds.
//

/** What the runner needs from a database. */
export type VersionDocumentsHost = {
  readonly _repo: RepoProxy;
  _getSpaceRootDocHandle(): DocHandleProxy<DatabaseDirectory>;
};

/** Per-object memory of edits already handled, so each is examined once per target. */
export type VersionSettled = Map<string, Set<string>>;

export type SyncVersionsOptions = {
  /** The objects to sync; every object of a versioned type when absent. */
  objectIds?: Iterable<string>;
  settled?: VersionSettled;
  /** Receives every version document handle the pass loaded, to watch for further edits. */
  onHandle?: (objectId: string, handle: DocHandleProxy<DatabaseDirectory>) => void;
};

type Held = { version: string; handle: DocHandleProxy<DatabaseDirectory> };

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

/** The values along `path` from the space root, through every alternative at each step. */
const alternativesAlong = (root: DatabaseDirectory, path: readonly string[]): unknown[] =>
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

const load = async (host: VersionDocumentsHost, url: string): Promise<DocHandleProxy<DatabaseDirectory>> => {
  const handle = host._repo.find<DatabaseDirectory>(url as DocumentId);
  await handle.whenReady();
  return handle;
};

const register = (host: VersionDocumentsHost, objectId: string, version: string, url: string): void => {
  host._getSpaceRootDocHandle().change((doc: DatabaseDirectory) => {
    // Assign through re-read proxies: a chained `??=` result is a detached literal under Automerge.
    doc.branches ??= {};
    doc.branches[objectId] ??= {};
    doc.branches[objectId][DatabaseDirectory.versionBranchName(version)] = {
      members: { [objectId]: new A.RawString(url) },
    };
  });
};

/**
 * One pass over `objectIds`: creates every missing version document, merges duplicates into the
 * registry's winner, and translates edits between the versions until none is left.
 */
export const syncVersionDocuments = async (
  host: VersionDocumentsHost,
  lenses: readonly VersionLens.VersionLens[],
  objectIds: Iterable<string>,
  options: Omit<SyncVersionsOptions, 'objectIds'> = {},
): Promise<void> => {
  for (const objectId of objectIds) {
    try {
      await syncObject(host, lenses, objectId, options);
    } catch (err) {
      log.warn('version documents: could not sync object', { objectId, err });
    }
  }
};

const syncObject = async (
  host: VersionDocumentsHost,
  lenses: readonly VersionLens.VersionLens[],
  objectId: string,
  { settled, onHandle }: Omit<SyncVersionsOptions, 'objectIds'>,
): Promise<void> => {
  const root = host._getSpaceRootDocHandle();
  const legacyUrl = root.doc().links?.[objectId]?.toString();
  if (!legacyUrl) {
    // Inline objects share the space root and have no document of their own to version.
    return;
  }
  const legacy = await load(host, legacyUrl);
  const legacyVersion = versionOfDoc(legacy.doc(), objectId, lenses);
  const typename = lenses.find(
    (lens) => legacyVersion !== undefined && (lens.fromVersion === legacyVersion || lens.toVersion === legacyVersion),
  )?.typename;
  if (!legacyVersion || !typename) {
    return;
  }
  const held = new Map<string, Held>([[legacyVersion, { version: legacyVersion, handle: legacy }]]);

  // Recorded versions: load the winner and fold every losing duplicate into it.
  for (const version of recordedVersions(root.doc(), objectId)) {
    const [winnerUrl, ...losers] = candidatesOf(root.doc(), objectId, DatabaseDirectory.versionBranchName(version));
    if (!winnerUrl) {
      continue;
    }
    const winner = await load(host, winnerUrl);
    for (const loserUrl of losers) {
      const loser = await load(host, loserUrl);
      if (!A.hasHeads(winner.doc(), A.getHeads(loser.doc()))) {
        winner.update((doc) => A.merge(doc, loser.doc()));
      }
    }
    held.set(version, { version, handle: winner });
  }

  // Versions recorded only inside a hidden parent map lose their entry; record them again.
  for (const version of recordedVersions(root.doc(), objectId)) {
    const visible = DatabaseDirectory.getVersionDocUrls(root.doc(), objectId)[version];
    const candidate = candidatesOf(root.doc(), objectId, DatabaseDirectory.versionBranchName(version))[0];
    if (!visible && candidate) {
      register(host, objectId, version, candidate);
    }
  }

  // Missing versions are derived from the origin: the document the app created the object in.
  const origin = [...held.values()].find(({ handle }) => !isDerived(handle.doc()));
  for (const version of VersionLens.versionsOf(lenses, typename)) {
    if (held.has(version) || !origin) {
      continue;
    }
    const derived = deriveVersionDoc({
      origin: origin.handle.doc(),
      originVersion: origin.version,
      version,
      objectId,
      typename,
      lenses,
    });
    if (!derived) {
      continue;
    }
    const handle = host._repo.import<DatabaseDirectory>(A.save(derived));
    await handle.whenReady();
    if (!handle.url) {
      continue;
    }
    register(host, objectId, version, handle.url);
    held.set(version, { version, handle });
  }

  for (const { handle } of held.values()) {
    onHandle?.(objectId, handle);
  }

  let objectSettled = settled?.get(objectId);
  if (settled && !objectSettled) {
    objectSettled = new Set();
    settled.set(objectId, objectSettled);
  }
  translateAll([...held.values()], objectId, typename, lenses, objectSettled);
};

/** Translates between every pair of held versions until a round writes nothing. */
const translateAll = (
  held: readonly Held[],
  objectId: string,
  typename: string,
  lenses: readonly VersionLens.VersionLens[],
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
          lenses,
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
