//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import { Lens, Type } from '@dxos/echo';
import { type DatabaseDirectory, EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import {
  type ChangeGraph,
  creationChange,
  frontierOf,
  isTranslation,
  parseTranslation,
  rootChangesOf,
  translationMessage,
} from '../../core-db/index.ts';
import { encodedValuesEqual, isRecord } from '../encoded-value.ts';
import { applyStructuralEdit } from '../fold-edit.ts';

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

const PROBE_ACTOR = '00000000000000000000000000000000';

const digest = (seed: string): string => bytesToHex(sha256(utf8ToBytes(seed))).slice(0, 32);

/** The digest identifying the lenses a translation between two versions runs. */
const lensDigest = (path: Lens.VersionPath): string => digest(JSON.stringify(path.digests));

const plain = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** The object's entry in `doc` as of `heads`, as plain values. */
const objectAt = (doc: VersionDoc, heads: Heads, objectId: string): Data | undefined => {
  const entry: unknown = plain(A.view(doc, heads).objects?.[objectId]);
  return isRecord(entry) ? entry : undefined;
};

/** The declared type of the object in `doc`, among the versions `lenses` connect. */
export const typeOfDoc = (doc: VersionDoc, objectId: string, lenses: readonly Lens.Any[]): Type.AnyObj | undefined => {
  const type = doc.objects?.[objectId]?.system?.type;
  if (!type) {
    return undefined;
  }
  const uri = EncodedReference.toURI(type);
  return lenses
    .filter(Lens.isVersionLens)
    .flatMap((lens) => [lens.source, lens.target])
    .find((entity) => Type.getURI(entity) === uri);
};

/** The schema version of the object in `doc`, read from its type among the versions `lenses` know. */
export const versionOfDoc = (doc: VersionDoc, objectId: string, lenses: readonly Lens.Any[]): string | undefined => {
  const type = typeOfDoc(doc, objectId, lenses);
  return type && Lens.versionOf(type);
};

/** Whether `doc` was derived from another version document rather than created by an app. */
export const isDerived = (doc: VersionDoc): boolean => rootOf(doc) !== undefined;

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
  lenses: readonly Lens.Any[];
}): VersionDoc | undefined => {
  const path = Lens.versionPath(lenses, typename, originVersion, version);
  const type = Lens.typeOfVersion(lenses, typename, version);
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
const sectionsOf = (entry: Data | undefined, path: Lens.VersionPath): { at: string[]; value: Data }[] => {
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

type Section = { at: string[]; value: Data };

/** What changes between two states, section by section. */
const diffSections = (before: Section[], after: Section[]): Move[] =>
  before.flatMap(({ at, value: previous }, index) => {
    const next = after[index].value;
    return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
      .filter((key) => !encodedValuesEqual(previous[key], next[key]))
      .map((key) => ({ at, key, previous: previous[key], next: next[key] }));
  });

/**
 * Translates every original edit made in `source` that `target` lacks into `target`, and returns the
 * new target. An edit waits while the target lacks the image of one of its ancestors, since forking
 * without it would not be deterministic; `settled` records edits already handled, so each is examined
 * once per target.
 *
 * The work per edit is bounded by what the edit touches: the change graphs and images are built once and
 * kept current, an edit's ancestry is walked only down to its nearest translated ancestors, and while
 * translations form a chain each is authored on one working copy instead of a fresh copy of the history.
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
  lenses: readonly Lens.Any[];
  settled?: Set<string>;
}): VersionDoc => {
  const path = Lens.versionPath(lenses, typename, source.version, target.version);
  if (!path || !designates(source.doc, target.doc, lenses, typename)) {
    return target.doc;
  }
  const sourceChanges = A.getChangesMetaSince(source.doc, []);
  const sourceByHash = new Map(sourceChanges.map((change) => [change.hash, change]));
  const sourceGraph: ChangeGraph = new Map(sourceChanges.map((change) => [change.hash, change.deps]));
  const sourceRoots = rootChangesOf(source.doc, objectId, sourceGraph);

  const targetChanges = A.getChangesMetaSince(target.doc, []);
  const targetGraph: ChangeGraph = new Map(targetChanges.map((change) => [change.hash, change.deps]));
  const imageOf = new Map<string, string>();
  for (const change of targetChanges) {
    const translation = parseTranslation(change.message);
    if (translation) {
      imageOf.set(translation.original, change.hash);
    }
  }
  const rootFork = frontierOf(targetGraph, rootChangesOf(target.doc, objectId, targetGraph));

  // Source states by heads: in a chain of edits, one edit's state after is the next one's state before.
  const states = new Map<string, Section[]>();
  const stateAt = (heads: readonly string[]): Section[] => {
    const key = [...heads].sort().join();
    let state = states.get(key);
    if (!state) {
      state = sectionsOf(objectAt(source.doc, [...heads], objectId), path);
      states.set(key, state);
    }
    return state;
  };
  const moved = new Map<string, Move[]>();
  const movesOf = (change: A.ChangeMetadata): Move[] => {
    let moves = moved.get(change.hash);
    if (!moves) {
      moves = change.deps.length === 0 ? [] : diffSections(stateAt(change.deps), stateAt([change.hash]));
      moved.set(change.hash, moves);
    }
    return moves;
  };

  // `A.merge` and `A.applyChanges` consume the document they change, and the caller's may be a live one.
  let doc = target.doc;
  let owned = false;
  let mirror: Mirror | undefined;
  // Translations are applied together: each apply costs time in proportion to the whole history.
  const pending: Uint8Array[] = [];
  const flush = () => {
    if (pending.length > 0) {
      [doc] = A.applyChanges(owned ? doc : A.clone(doc), pending.splice(0));
      owned = true;
    }
  };
  for (const change of sourceChanges) {
    const key = `${change.hash}>${target.version}`;
    if (settled?.has(key) || sourceRoots.has(change.hash) || isTranslation(change.message)) {
      continue;
    }
    const moves = imageOf.has(change.hash) ? [] : movesOf(change);
    if (moves.length === 0) {
      settled?.add(key);
      continue;
    }
    const fork = forkOf({
      change,
      sourceByHash,
      sourceRoots,
      imageOf,
      targetGraph,
      targetVersion: target.version,
      movesOf,
      rootFork,
    });
    if (fork === 'waiting') {
      continue;
    }

    if (!mirror || fork.length !== 1 || fork[0] !== mirror.head) {
      flush();
      mirror = { doc: A.clone(A.view(doc, fork), PROBE_ACTOR), head: fork[0], probeHead: undefined, probes: [] };
    }
    const at = mirror.probeHead ? [mirror.probeHead] : fork;
    // The mirror's state is the state at `at`, so it is read as is rather than through a view of history.
    const live = mirror.doc;
    const current = moves.map(({ at, key }) => plain(getDeep(live, ['objects', objectId, ...at, key])));
    const message = translationMessage(change.hash, source.version);
    const probe = A.changeAt(mirror.doc, at, { message, time: 0 }, (draft) => {
      moves.forEach(({ at, key, previous, next }, index) => {
        applyStructuralEdit(draft, ['objects', objectId, ...at, key], previous, next, current[index]);
      });
    });
    const probeChange = probe.newHeads ? A.getLastLocalChange(probe.newDoc) : undefined;
    if (!probe.newHeads || !probeChange) {
      mirror = undefined;
      settled?.add(key);
      continue;
    }
    const translation = authorShared(
      probeChange,
      fork,
      mirror.probes,
      JSON.stringify({ original: change.hash, target: target.version, fork }),
    );
    const { hash, actor, startOp } = A.decodeChange(translation);
    pending.push(translation);
    mirror = {
      doc: probe.newDoc,
      head: hash,
      probeHead: probe.newHeads[0],
      probes: [...mirror.probes, { startOp, actor }],
    };
    targetGraph.set(hash, fork);
    imageOf.set(change.hash, hash);
    settled?.add(key);
  }
  flush();
  return doc;
};

/**
 * Where a translation of `change` forks: the frontier of its ancestors' images in the target. The walk
 * stops at an ancestor with an image, since that image was forked at the images of the ancestor's own
 * ancestors; an original that moves nothing has no image, and its ancestors stand in for it.
 */
const forkOf = ({
  change,
  sourceByHash,
  sourceRoots,
  imageOf,
  targetGraph,
  targetVersion,
  movesOf,
  rootFork,
}: {
  change: A.ChangeMetadata;
  sourceByHash: Map<string, A.ChangeMetadata>;
  sourceRoots: Set<string>;
  imageOf: Map<string, string>;
  targetGraph: ChangeGraph;
  targetVersion: string;
  movesOf: (change: A.ChangeMetadata) => Move[];
  rootFork: Heads;
}): Heads | 'waiting' => {
  const images: string[] = [];
  const seen = new Set<string>();
  const stack = [...change.deps];
  for (let ancestor = stack.pop(); ancestor !== undefined; ancestor = stack.pop()) {
    if (seen.has(ancestor) || sourceRoots.has(ancestor)) {
      continue;
    }
    seen.add(ancestor);
    const meta = sourceByHash.get(ancestor);
    if (!meta) {
      return 'waiting';
    }
    const translation = parseTranslation(meta.message);
    const original = translation?.original ?? meta.hash;
    const image = translation?.source === targetVersion ? original : imageOf.get(original);
    if (image) {
      images.push(image);
    } else if (translation || movesOf(meta).length > 0) {
      return 'waiting';
    } else {
      stack.push(...meta.deps);
    }
  }
  return images.length > 0 ? frontierOf(targetGraph, images) : rootFork;
};

/**
 * A copy of the target's history at a translation's fork, extended by probes: each translation authored
 * under {@link PROBE_ACTOR} at the previous probe, so a chain of translations is authored without copying
 * the history again. A probe numbers its ops exactly as its translation does, so the two differ only in
 * the actor the ops are named by.
 */
type Mirror = {
  doc: VersionDoc;
  /** The translation the mirror's state stands for. */
  head: string;
  /** The last probe, whose state is the state at `head`; undefined before the first. */
  probeHead: string | undefined;
  /** Each probe's first op counter and its translation's actor, in order. */
  probes: { startOp: number; actor: string }[];
};

/**
 * The translation a probe stands for, authored at `deps` under an actor derived from `seed` and the
 * change's own ops, so every device that writes it writes the same bytes: the probe's own ops named by
 * that actor, and those of earlier probes by their translations' actors.
 */
const authorShared = (
  probe: Uint8Array,
  deps: readonly string[],
  probes: readonly { startOp: number; actor: string }[],
  seed: string,
): Uint8Array => {
  const decoded = A.decodeChange(probe);
  const rename = (own: string) =>
    JSON.stringify(decoded.ops).replace(new RegExp(`(\\d+)@${PROBE_ACTOR}`, 'g'), (_, counter: string) => {
      const op = Number(counter);
      const actor = op >= decoded.startOp ? own : probes.findLast(({ startOp }) => startOp <= op)?.actor;
      invariant(actor !== undefined, 'probe op outside every probe');
      return `${counter}@${actor}`;
    });
  const actor = digest(`${seed}:${rename('')}`);
  return A.encodeChange({ ...decoded, actor, seq: 1, deps: [...deps], ops: JSON.parse(rename(actor)) });
};

/**
 * Whether this device's lenses are the ones the documents were derived with: a derived document records
 * the digest of the lenses from its origin, and a device whose lenses differ stays out.
 */
const designates = (one: VersionDoc, two: VersionDoc, lenses: readonly Lens.Any[], typename: string): boolean =>
  [one, two].every((doc) => {
    const root = rootOf(doc);
    const path = root && Lens.versionPath(lenses, typename, root.origin, root.version);
    return !root || (path !== undefined && lensDigest(path) === root.lenses);
  });
