//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';

import { Type, VersionLens } from '@dxos/echo';
import { DatabaseDirectory } from '@dxos/echo-protocol';
import { log } from '@dxos/log';

import { type DocHandleProxy, type RepoProxy } from '../../automerge/index.ts';
import { isRecord } from '../encoded-value.ts';
import {
  type VersionDoc,
  deriveVersionDoc,
  isDerived,
  translate,
  typeOfVersion,
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
  if (!isValidAutomergeUrl(url)) {
    throw new TypeError(`not a document url: ${url}`);
  }
  const handle = host._repo.find<DatabaseDirectory>(url);
  await handle.whenReady();
  return handle;
};

/** Merges every duplicate document into `winner`: both share the same root, so the result is their union. */
const mergeLosers = async (
  host: VersionDocumentsHost,
  winner: DocHandleProxy<DatabaseDirectory>,
  losers: readonly string[],
  accept: (doc: VersionDoc) => boolean = () => true,
): Promise<void> => {
  for (const url of losers) {
    const loser = await load(host, url);
    if (accept(loser.doc()) && !A.hasHeads(winner.doc(), A.getHeads(loser.doc()))) {
      winner.update((doc) => A.merge(doc, loser.doc()));
    }
  }
};

const register = (host: VersionDocumentsHost, objectId: string, version: string, url: string, type: string): void => {
  host._getSpaceRootDocHandle().change((doc: DatabaseDirectory) => {
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
  const [legacyUrl, ...legacyLosers] = [
    ...new Set(alternativesAlong(root.doc(), ['links', objectId]).map((url) => String(url))),
  ];
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
  const typeOf = (version: string): string | undefined => {
    const type = typeOfVersion(lenses, typename, version);
    return type && Type.getURI(type);
  };
  await mergeLosers(host, legacy, legacyLosers, (doc) => versionOfDoc(doc, objectId, lenses) === legacyVersion);
  const held = new Map<string, Held>([[legacyVersion, { version: legacyVersion, handle: legacy }]]);
  // The registry lists every version, the linked one included, so a reader can pick among them unloaded.
  const legacyType = typeOf(legacyVersion);
  if (legacyType && DatabaseDirectory.getVersionDocUrls(root.doc(), objectId)[legacyVersion] !== legacyUrl) {
    register(host, objectId, legacyVersion, legacyUrl, legacyType);
  }

  // Recorded versions: load the winner and fold every losing duplicate into it.
  for (const version of recordedVersions(root.doc(), objectId)) {
    const [winnerUrl, ...losers] = candidatesOf(root.doc(), objectId, DatabaseDirectory.versionBranchName(version));
    if (!winnerUrl || version === legacyVersion) {
      continue;
    }
    const winner = await load(host, winnerUrl);
    await mergeLosers(host, winner, losers);
    held.set(version, { version, handle: winner });
    // A version recorded only inside a map a concurrent write hid has no visible entry; record it again.
    const type = typeOf(version);
    if (!DatabaseDirectory.getVersionDocUrls(root.doc(), objectId)[version] && type) {
      register(host, objectId, version, winnerUrl, type);
    }
  }

  // Missing versions are derived from the origin: the document the app created the object in.
  const origin = [...held.values()].find(({ handle }) => !isDerived(handle.doc()));
  for (const version of VersionLens.versionsOf(lenses, typename)) {
    const type = typeOf(version);
    if (held.has(version) || !origin || !type) {
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
    register(host, objectId, version, handle.url, type);
    held.set(version, { version, handle });
  }

  // Released apps follow only `links`, so it names the oldest version, including for an object an app
  // created at a newer one.
  const [oldest] = VersionLens.versionsOf(lenses, typename);
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

  translateAll([...held.values()], objectId, typename, lenses, settledFor(settled, objectId));
  await syncBranches(host, lenses, objectId, typename, origin, { settled, onHandle });
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
  host: VersionDocumentsHost,
  lenses: readonly VersionLens.VersionLens[],
  objectId: string,
  typename: string,
  origin: Held | undefined,
  { settled, onHandle }: Omit<SyncVersionsOptions, 'objectIds'>,
): Promise<void> => {
  const root = host._getSpaceRootDocHandle();
  for (const [rootId, byName] of Object.entries(root.doc().branches ?? {})) {
    for (const [name, record] of Object.entries(byName)) {
      const memberUrl = record.members?.[objectId]?.toString();
      if (DatabaseDirectory.isReservedBranchName(name) || !memberUrl) {
        continue;
      }
      const member = await load(host, memberUrl);
      const memberVersion = versionOfDoc(member.doc(), objectId, lenses);
      if (!memberVersion) {
        continue;
      }
      const held = new Map<string, Held>([[memberVersion, { version: memberVersion, handle: member }]]);
      for (const [version, url] of Object.entries(record.versions?.[objectId] ?? {})) {
        held.set(version, { version, handle: await load(host, url.toString()) });
      }
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
        const url = handle.url;
        if (!url) {
          continue;
        }
        root.change((doc: DatabaseDirectory) => {
          const branch = doc.branches?.[rootId]?.[name];
          if (branch) {
            branch.versions ??= {};
            branch.versions[objectId] ??= {};
            branch.versions[objectId][version] = new A.RawString(url);
          }
        });
        held.set(version, { version, handle });
      }
      for (const { handle } of held.values()) {
        onHandle?.(objectId, handle);
      }
      translateAll(
        [...held.values()],
        objectId,
        typename,
        lenses,
        settledFor(settled, `${objectId} ${rootId}/${name}`),
      );
    }
  }
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
