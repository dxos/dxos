//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import { Type, VersionLens } from '@dxos/echo';
import { type DatabaseDirectory, EncodedReference } from '@dxos/echo-protocol';

import { encodedValuesEqual, isRecord } from '../encoded-value.ts';
import { type ChangeGraph, ancestorsOf, applyStructuralEdit, frontierOf } from '../fold-edit.ts';

//
// One object stored as one Automerge document per schema version (`.agents/projects/lenses/DESIGN.md` §12).
// Every device that holds two version documents of an object translates each original edit from one
// into the other, and writes the same bytes as every other device doing the same:
// 1. A version document's root is derived from the object's state when it was created in its origin
//    document, through the lenses, by a content-derived actor at time 0.
// 2. Only original edits are translated, never translations, each straight from the document it was
//    made in.
// 3. A translation forks at the target's images of the edit's ancestors and is authored by an actor
//    derived from its ops.
// The lens keys a document was derived with are recorded in its root; a device translates only with
// the same lenses, so two builds of one lens never both write.
//

export type VersionDoc = A.Doc<DatabaseDirectory>;

type Data = Record<string, unknown>;

const ROOT_MESSAGE = 'version-root';

type Root = { creation: string; origin: string; version: string; lenses: string };

/** Root message: the origin's creation change and version, this version, and a digest of the lenses between them. */
const rootMessage = ({ creation, origin, version, lenses }: Root): string =>
  `${ROOT_MESSAGE} ${creation} ${origin} ${version} ${lenses}`;

const parseRoot = (message: string | null): Root | undefined => {
  const match = message?.match(/^version-root (\S+) (\S+) (\S+) (\S+)$/);
  return match ? { creation: match[1], origin: match[2], version: match[3], lenses: match[4] } : undefined;
};

const rootOf = (doc: VersionDoc): Root | undefined => {
  const [root] = A.getChangesMetaSince(doc, []);
  return parseRoot(root?.message ?? null);
};

/** The message a translation of `original` (an edit made in version `source`) is stamped with. */
const translationMessage = (original: string, source: string): string => `translate: ${original} from ${source}`;

const parseTranslation = (message: string | null): { original: string; source: string } | undefined => {
  const match = message?.match(/^translate: (\S+) from (\S+)$/);
  return match ? { original: match[1], source: match[2] } : undefined;
};

/** Whether a change message marks a translation. */
export const isTranslation = (message: string | null): boolean => parseTranslation(message) !== undefined;

const PROBE_ACTOR = '00000000000000000000000000000000';

const digest = (seed: string): string => bytesToHex(sha256(utf8ToBytes(seed))).slice(0, 32);

/** The digest identifying the lenses a translation between two versions runs. */
const lensDigest = (path: VersionLens.Path): string => digest(JSON.stringify(path.keys));

/**
 * Authors one change at exactly `heads` under an actor derived from `seed` and the change's own ops, so
 * every device authoring it writes the same bytes, and merges it into `doc`.
 */
const sharedChange = (
  doc: VersionDoc,
  heads: Heads,
  mutate: (draft: DatabaseDirectory) => void,
  message: string,
  seed: string,
): VersionDoc => {
  const view = A.view(doc, heads);
  const author = (actor: string) => A.changeAt(A.clone(view, actor), heads, { message, time: 0 }, mutate);
  const probe = author(PROBE_ACTOR);
  const change = probe.newHeads && A.getLastLocalChange(probe.newDoc);
  if (!change) {
    return doc;
  }
  const ops = JSON.stringify(A.decodeChange(change).ops).replaceAll(PROBE_ACTOR, '');
  return A.merge(doc, author(digest(`${seed}:${ops}`)).newDoc);
};

const plain = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** The object's entry in `doc` as of `heads`, as plain values. */
const objectAt = (doc: VersionDoc, heads: Heads, objectId: string): Data | undefined => {
  const entry: unknown = plain(A.view(doc, heads).objects?.[objectId]);
  return isRecord(entry) ? entry : undefined;
};

/**
 * The change that created the object in `doc`: the first, in causal order, whose state holds it. Only
 * that change's descendants can hold it, so the first found has no ancestor that does.
 */
export const creationChange = (doc: VersionDoc, objectId: string): A.ChangeMetadata | undefined =>
  A.getChangesMetaSince(doc, []).find((change) => objectAt(doc, [change.hash], objectId) !== undefined);

/** The schema version of the object in `doc`, read from its type among the versions `lenses` know. */
export const versionOfDoc = (
  doc: VersionDoc,
  objectId: string,
  lenses: readonly VersionLens.VersionLens[],
): string | undefined => {
  const type = doc.objects?.[objectId]?.system?.type;
  if (!type) {
    return undefined;
  }
  const uri = EncodedReference.toURI(type);
  for (const lens of lenses) {
    for (const entity of [lens.from, lens.to]) {
      if (Type.getURI(entity) === uri) {
        return VersionLens.versionOf(entity);
      }
    }
  }
  return undefined;
};

/** Whether `doc` was derived from another version document rather than created by an app. */
export const isDerived = (doc: VersionDoc): boolean => rootOf(doc) !== undefined;

const typeOfVersion = (
  lenses: readonly VersionLens.VersionLens[],
  typename: string,
  version: string,
): Type.AnyObj | undefined => {
  for (const lens of lenses) {
    if (lens.typename === typename && lens.fromVersion === version) {
      return lens.from;
    }
    if (lens.typename === typename && lens.toVersion === version) {
      return lens.to;
    }
  }
  return undefined;
};

/**
 * The document for `version` of the object whose origin document (the one an app created it in) is
 * `origin`, at version `originVersion`. Every device derives the same root; the returned document then
 * edits under a fresh actor of its own.
 */
export const deriveVersionDoc = ({
  origin,
  originVersion,
  version,
  objectId,
  typename,
  lenses,
}: {
  origin: VersionDoc;
  originVersion: string;
  version: string;
  objectId: string;
  typename: string;
  lenses: readonly VersionLens.VersionLens[];
}): VersionDoc | undefined => {
  const path = VersionLens.findPath(lenses, typename, originVersion, version);
  const type = typeOfVersion(lenses, typename, version);
  const creation = creationChange(origin, objectId);
  if (!path || !type || !creation) {
    return undefined;
  }
  const entry = objectAt(origin, [creation.hash], objectId);
  const state = A.view(origin, [creation.hash]);
  const data = isRecord(entry?.data) ? entry.data : {};
  const system = isRecord(entry?.system) ? entry.system : {};
  const object = {
    ...entry,
    system: { ...system, type: EncodedReference.fromURI(Type.getURI(type)) },
    data: path.apply(data),
  };
  const root = {
    version: plain(state.version),
    access: plain(state.access),
    objects: { [objectId]: object },
  };
  const actor = digest(`${creation.hash}:${version}:${JSON.stringify(root)}`);
  const created = A.change(
    A.init<DatabaseDirectory>({ actor }),
    {
      message: rootMessage({ creation: creation.hash, origin: originVersion, version, lenses: lensDigest(path) }),
      time: 0,
    },
    (draft: Data) => {
      for (const [key, value] of Object.entries(root)) {
        if (value !== undefined) {
          draft[key] = value;
        }
      }
    },
  );
  // The root's actor is shared by every device that derived it; this device's edits need their own.
  return A.clone(created);
};

/** A document version and the lens path mapping data from it into the target. */
export type TranslationSource = {
  doc: VersionDoc;
  version: string;
};

/** The parts of an object translated into another version: data through the lenses, the rest as is. */
const sectionsOf = (entry: Data | undefined, path: VersionLens.Path): { at: string[]; value: Data }[] => {
  const data = isRecord(entry?.data) ? entry.data : {};
  const meta = isRecord(entry?.meta) ? entry.meta : {};
  const system = isRecord(entry?.system) ? entry.system : {};
  return [
    { at: ['data'], value: path.apply(data) },
    { at: ['meta'], value: meta },
    { at: ['system'], value: system.deleted === undefined ? {} : { deleted: system.deleted } },
  ];
};

type Move = { at: string[]; key: string; previous: unknown; next: unknown };

/** What `change` moves in the target, through `path`. */
const movesOf = (doc: VersionDoc, change: A.ChangeMetadata, objectId: string, path: VersionLens.Path): Move[] => {
  if (change.deps.length === 0) {
    return [];
  }
  const before = sectionsOf(objectAt(doc, [...change.deps], objectId), path);
  const after = sectionsOf(objectAt(doc, [change.hash], objectId), path);
  return before.flatMap(({ at, value: previous }, index) => {
    const next = after[index].value;
    return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
      .filter((key) => !encodedValuesEqual(previous[key], next[key]))
      .map((key) => ({ at, key, previous: previous[key], next: next[key] }));
  });
};

/**
 * The changes of `doc` that stand for the object's creation: its root when derived, else its creation
 * change and every change before it.
 */
const rootChangesOf = (doc: VersionDoc, objectId: string, graph: ChangeGraph): Set<string> => {
  const creation = creationChange(doc, objectId);
  return creation ? new Set([creation.hash, ...ancestorsOf(graph, creation.deps)]) : new Set();
};

/**
 * Translates every original edit made in `source` that `target` lacks into `target`, and returns the
 * new target. An edit waits while the target lacks the image of one of its ancestors, since forking
 * without it would not be deterministic; `settled` records edits already handled, so each is examined
 * once per target.
 */
export const translate = ({
  source,
  target,
  objectId,
  typename,
  lenses,
  settled,
}: {
  source: TranslationSource;
  target: TranslationSource;
  objectId: string;
  typename: string;
  lenses: readonly VersionLens.VersionLens[];
  settled?: Set<string>;
}): VersionDoc => {
  const path = VersionLens.findPath(lenses, typename, source.version, target.version);
  if (!path || !designates(source.doc, target.doc, lenses, typename)) {
    return target.doc;
  }
  const sourceChanges = A.getChangesMetaSince(source.doc, []);
  const sourceByHash = new Map(sourceChanges.map((change) => [change.hash, change]));
  const sourceGraph: ChangeGraph = new Map(sourceChanges.map((change) => [change.hash, change.deps]));
  const sourceRoots = rootChangesOf(source.doc, objectId, sourceGraph);

  // `A.merge` consumes the document it merges into, and the caller's may be a handle's live one.
  let doc = target.doc;
  let owned = false;
  for (const change of sourceChanges) {
    const key = `${change.hash}>${target.version}`;
    if (settled?.has(key) || sourceRoots.has(change.hash) || isTranslation(change.message)) {
      continue;
    }
    const next = translateEdit({
      source,
      sourceByHash,
      sourceGraph,
      sourceRoots,
      target: doc,
      own: () => {
        if (!owned) {
          doc = A.clone(doc);
          owned = true;
        }
        return doc;
      },
      targetVersion: target.version,
      change,
      objectId,
      path,
    });
    if (next === 'waiting') {
      continue;
    }
    doc = next;
    settled?.add(key);
  }
  return doc;
};

/**
 * Whether this device's lenses are the ones the documents were derived with: a derived document records
 * the digest of the lenses from its origin, and a device whose lenses differ stays out.
 */
const designates = (
  one: VersionDoc,
  two: VersionDoc,
  lenses: readonly VersionLens.VersionLens[],
  typename: string,
): boolean =>
  [one, two].every((doc) => {
    const root = rootOf(doc);
    const path = root && VersionLens.findPath(lenses, typename, root.origin, root.version);
    return !root || (path !== undefined && lensDigest(path) === root.lenses);
  });

const translateEdit = ({
  source,
  sourceByHash,
  sourceGraph,
  sourceRoots,
  target,
  own,
  targetVersion,
  change,
  objectId,
  path,
}: {
  source: TranslationSource;
  sourceByHash: Map<string, A.ChangeMetadata>;
  sourceGraph: ChangeGraph;
  sourceRoots: Set<string>;
  target: VersionDoc;
  /** The target as a copy this translation may consume. */
  own: () => VersionDoc;
  targetVersion: string;
  change: A.ChangeMetadata;
  objectId: string;
  path: VersionLens.Path;
}): VersionDoc | 'waiting' => {
  const targetChanges = A.getChangesMetaSince(target, []);
  const imageOf = new Map<string, string>();
  for (const candidate of targetChanges) {
    const translation = parseTranslation(candidate.message);
    if (translation) {
      imageOf.set(translation.original, candidate.hash);
    }
  }
  if (imageOf.has(change.hash)) {
    return target;
  }
  const moves = movesOf(source.doc, change, objectId, path);
  if (moves.length === 0) {
    return target;
  }

  const targetGraph: ChangeGraph = new Map(targetChanges.map((meta) => [meta.hash, meta.deps]));
  const targetRoots = rootChangesOf(target, objectId, targetGraph);
  const images: string[] = [];
  for (const ancestor of ancestorsOf(sourceGraph, change.deps)) {
    if (sourceRoots.has(ancestor)) {
      continue;
    }
    const meta = sourceByHash.get(ancestor);
    if (!meta) {
      return 'waiting';
    }
    const translation = parseTranslation(meta.message);
    const original = translation?.original ?? meta.hash;
    const image = translation?.source === targetVersion ? original : imageOf.get(original);
    if (image) {
      images.push(image);
    } else if (translation || movesOf(source.doc, meta, objectId, path).length > 0) {
      return 'waiting';
    }
    // An original that moves nothing in the target has no image; its own ancestors stand in for it.
  }
  const fork = frontierOf(targetGraph, images.length > 0 ? images : [...targetRoots]);
  const current = sectionsOf(objectAt(target, fork, objectId), identityPath);
  return sharedChange(
    own(),
    fork,
    (draft) => {
      for (const { at, key, previous, next } of moves) {
        const section = current.find((candidate) => candidate.at.join() === at.join());
        applyStructuralEdit(draft, ['objects', objectId, ...at, key], previous, next, section?.value[key]);
      }
    },
    translationMessage(change.hash, source.version),
    JSON.stringify({ original: change.hash, target: targetVersion, fork }),
  );
};

const identityPath: VersionLens.Path = { keys: [], apply: (data) => data };
