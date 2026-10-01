//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import { Lens } from '@dxos/echo';
import { type DatabaseDirectory, EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type URI } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import { encodedValuesEqual, isRecord } from './encoded-value.ts';
import { applyStructuralEdit } from './fold-edit.ts';
import {
  type ChangeGraph,
  creationChange,
  frontierOf,
  isTranslation,
  parseTranslation,
  rootChangesOf,
  translationMessage,
} from './version-history.ts';

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

/** A short hex digest of `seed`, for actors and keys every device derives alike. */
export const hashOf = (seed: string): string => bytesToHex(sha256(utf8ToBytes(seed))).slice(0, 32);

/** The digest identifying the lenses a translation between two versions runs. */
const lensDigest = (path: Lens.VersionPath): string => hashOf(JSON.stringify(path.digests));

const plain = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** The sections `project` reads from object `objectId` in `doc` as of `heads`. */
export const projectAt = (doc: VersionDoc, heads: Heads, objectId: string, project: Projection): Section[] =>
  project(objectAt(doc, heads, objectId), A.view(doc, heads));

/** The object's entry in `doc` as of `heads`, as plain values. */
const objectAt = (doc: VersionDoc, heads: Heads, objectId: string): Data | undefined => {
  const entry: unknown = plain(A.view(doc, heads).objects?.[objectId]);
  return isRecord(entry) ? entry : undefined;
};

/** The type URI and version of the object in `doc`, when its type is one of the versions `edges` connect. */
export const typeOfDoc = (
  doc: VersionDoc,
  objectId: string,
  edges: readonly Lens.VersionEdge[],
): { uri: string; typename: string; version: string } | undefined => {
  const type = doc.objects?.[objectId]?.system?.type;
  if (!type) {
    return undefined;
  }
  const uri = EncodedReference.toURI(type);
  for (const edge of edges) {
    if (edge.source === uri || edge.target === uri) {
      return { uri, typename: edge.typename, version: edge.source === uri ? edge.from : edge.to };
    }
  }
  return undefined;
};

/** The schema version of the object in `doc`, read from its type among the versions `edges` connect. */
export const versionOfDoc = (
  doc: VersionDoc,
  objectId: string,
  edges: readonly Lens.VersionEdge[],
): string | undefined => typeOfDoc(doc, objectId, edges)?.version;

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
  edges,
}: {
  origin: VersionDoc;
  originVersion: string;
  version: string;
  objectId: string;
  typename: string;
  edges: readonly Lens.VersionEdge[];
}): VersionDoc | undefined => {
  const path = Lens.versionPath(edges, typename, originVersion, version);
  const type = Lens.typeOfVersion(edges, typename, version);
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
    system: { ...system, type: EncodedReference.fromURI(type) },
    data: path.apply(data),
  };
  const root = {
    version: plain(state.version),
    access: plain(state.access),
    objects: { [objectId]: object },
  };
  const actor = hashOf(`${creation.hash}:${version}:${JSON.stringify(root)}`);
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

//
// A struct a newer version keeps in an object of its own (`Lens.extract`, DESIGN.md §12.10) is translated as
// the versions are: the extracted object's first change holds the struct as a version of the parent held it at
// its root, and its edits and the embedding versions' edits are translated into each other from where they
// were made. Only the parent's deletion follows into the extracted object, never the reverse.
//

const LINK_ROOT_MESSAGE = 'link-root';

/** The message of the change that creates an extracted object: the parent version and root it derives from. */
const linkRootMessage = (version: string, heads: readonly string[]): string =>
  `${LINK_ROOT_MESSAGE} ${version} ${heads.join(',')}`;

/** Whether version `version` of the parent embeds the struct `edge` extracts: it is no newer than the edge's older end. */
const embeds = (edge: Lens.VersionEdge, version: string): boolean => Lens.compareVersions(version, edge.from) <= 0;

/**
 * How version `version` of the parent reads in the object `link` extracts: the struct, through the lenses to
 * the edge's older version and through the link (nothing, for a version holding the reference), and the
 * parent's deletion.
 */
export const parentToLink = ({
  edges,
  edge,
  link,
  version,
}: {
  edges: readonly Lens.VersionEdge[];
  edge: Lens.VersionEdge;
  link: Lens.VersionLink;
  version: string;
}): Projection => {
  const path = embeds(edge, version) ? Lens.versionPath(edges, edge.typename, version, edge.from) : undefined;
  return (entry) => {
    const struct = path?.apply(isRecord(entry?.data) ? entry.data : {})[link.from];
    return [{ at: ['data'], value: path ? link.forward(isRecord(struct) ? struct : {}) : {} }, deletionOf(entry)];
  };
};

/**
 * How the object `link` extracts reads in version `version` of the parent, or `undefined` when that version
 * holds a reference rather than the struct.
 */
export const linkToParent = ({
  edges,
  edge,
  link,
  version,
}: {
  edges: readonly Lens.VersionEdge[];
  edge: Lens.VersionEdge;
  link: Lens.VersionLink;
  version: string;
}): Projection | undefined => {
  const path = embeds(edge, version) ? Lens.versionPath(edges, edge.typename, edge.from, version) : undefined;
  return (
    path &&
    ((entry) => [
      { at: ['data'], value: path.apply({ [link.from]: link.backward(isRecord(entry?.data) ? entry.data : {}) }) },
    ])
  );
};

/** An object's data as another object of the same type holds it: an extracted object merged into another. */
export const dataOf: Projection = (entry) => [{ at: ['data'], value: isRecord(entry?.data) ? entry.data : {} }];

/** The heads of `doc` its root stands for: the frontier of the changes that created the object in it. */
export const rootHeadsOf = (doc: VersionDoc, objectId: string): Heads => {
  const graph: ChangeGraph = new Map(A.getChangesMetaSince(doc, []).map((change) => [change.hash, change.deps]));
  return frontierOf(graph, rootChangesOf(doc, objectId, graph));
};

/** The parent version and heads an extracted object's document was derived from, read from its first change. */
export const linkRootOf = (doc: VersionDoc): { version: string; heads: Heads } | undefined => {
  const [root] = A.getChangesMetaSince(doc, []);
  const match = root?.message?.match(/^link-root (\S+) (\S*)$/);
  return match ? { version: match[1], heads: match[2].split(',').filter(Boolean) } : undefined;
};

/**
 * The document of an object extracted from version `version` of a parent at `heads`: object `childId` of type
 * `type`, under `convergenceKey`, holding `data`.
 */
export const deriveLinkDoc = ({
  parent,
  heads,
  version,
  type,
  childId,
  convergenceKey,
  data,
}: {
  parent: VersionDoc;
  heads: Heads;
  version: string;
  type: URI.URI;
  childId: string;
  convergenceKey: string;
  data: Data;
}): VersionDoc => {
  const state = A.view(parent, heads);
  return A.change(A.init<DatabaseDirectory>(), { message: linkRootMessage(version, heads) }, (draft: Data) => {
    for (const [key, value] of Object.entries({ version: plain(state.version), access: plain(state.access) })) {
      if (value !== undefined) {
        draft[key] = value;
      }
    }
    draft.objects = {
      [childId]: {
        system: { kind: 'object', type: EncodedReference.fromURI(type) },
        meta: { keys: [], convergenceKey },
        data,
      },
    };
  });
};

/** The element of the list at `path` in `doc` that is the map `elementId`, and where it is. */
export const elementAt = (
  doc: VersionDoc,
  path: readonly string[],
  elementId: string,
): { index: number; value: Data } | undefined => {
  const list = getDeep(doc, [...path]);
  if (!Array.isArray(list)) {
    return undefined;
  }
  const index = list.findIndex((item) => isRecord(item) && A.getObjectId(item) === elementId);
  const value = index < 0 ? undefined : plain(list[index]);
  return isRecord(value) ? { index, value } : undefined;
};

/**
 * How the parent's older version reads in the object `link` extracts from its element `elementId`: the
 * element through the link, and the deletion of the parent or of the element. Before the element exists and
 * once it is gone the data is unknown, so it moves nothing.
 */
export const parentToElement = ({
  link,
  objectId,
  elementId,
}: {
  link: Lens.VersionLink;
  objectId: string;
  elementId: string;
}): Projection => {
  return (entry, view) => {
    const element = elementAt(view, ['objects', objectId, 'data', link.from], elementId);
    const deletion = deletionOf(entry);
    return [
      { at: ['data'], value: element && link.forward(element.value) },
      element ? deletion : { at: ['system'], value: { deleted: true } },
    ];
  };
};

/** How the object extracted from element `elementId` reads in the parent's older version: at that element, wherever it is. */
export const elementToParent = ({
  link,
  objectId,
  elementId,
}: {
  link: Lens.VersionLink;
  objectId: string;
  elementId: string;
}): Projection => {
  const list = ['objects', objectId, 'data', link.from];
  return (entry) => [
    {
      at: (doc) => {
        const element = elementAt(doc, list, elementId);
        return element && ['data', link.from, element.index];
      },
      value: link.backward(isRecord(entry?.data) ? entry.data : {}),
    },
  ];
};

/** A parent's deletion alone, for a version that holds references rather than what an object was extracted from. */
export const parentDeletion: Projection = (entry) => [deletionOf(entry)];

/** A document version and the lens path mapping data from it into the target. */
export type TranslationSource = {
  doc: VersionDoc;
  version: string;
};

/** The parts of an object translated into another version: data through the lenses, the rest as is. */
const sectionsOf = (entry: Data | undefined, path: Lens.VersionPath): Section[] => {
  const data = isRecord(entry?.data) ? entry.data : {};
  const meta = isRecord(entry?.meta) ? entry.meta : {};
  return [{ at: ['data'], value: path.apply(data) }, { at: ['meta'], value: meta }, deletionOf(entry)];
};

/** The object's deletion, which follows it into every other version and into the objects extracted from it. */
export const deletionOf = (entry: Data | undefined): Section => {
  const system = isRecord(entry?.system) ? entry.system : {};
  return { at: ['system'], value: system.deleted === undefined ? {} : { deleted: system.deleted } };
};

/** A path inside an object's entry. */
export type EntryPath = readonly (string | number)[];

/**
 * Part of an object's entry as the target of a translation holds it: at a fixed path, or at one found in the
 * target's state (an element of a list, say). A value the source does not know is `undefined`, and moves nothing.
 */
export type Section = { at: EntryPath | ((doc: VersionDoc) => EntryPath | undefined); value: Data | undefined };

/** Reads the source object's entry, and the source document it was read from, as sections of the target. */
export type Projection = (entry: Data | undefined, view: VersionDoc) => Section[];

type Move = { at: Section['at']; key: string; previous: unknown; next: unknown };

/** What changes between two states, section by section. */
const diffSections = (before: Section[], after: Section[]): Move[] =>
  before.flatMap(({ at, value: previous }, index) => {
    const next = after[index].value;
    if (previous === undefined || next === undefined) {
      return [];
    }
    return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
      .filter((key) => !encodedValuesEqual(previous[key], next[key]))
      .map((key) => ({ at, key, previous: previous[key], next: next[key] }));
  });

/**
 * Translates every original edit made in `source` that `target` lacks into `target`, and returns the
 * new target, when the lenses between the two versions are the ones both documents were derived with.
 */
export const translate = ({
  source,
  target,
  objectId,
  typename,
  edges,
  settled,
}: {
  source: TranslationSource;
  target: TranslationSource;
  objectId: string;
  typename: string;
  edges: readonly Lens.VersionEdge[];
  settled?: Set<string>;
}): VersionDoc => {
  const path = Lens.versionPath(edges, typename, source.version, target.version);
  if (!path || !designates(source.doc, target.doc, edges, typename)) {
    return target.doc;
  }
  return translateBetween({
    source: { doc: source.doc, objectId, label: source.version },
    target: { doc: target.doc, objectId, label: target.version },
    project: (entry) => sectionsOf(entry, path),
    settled,
  });
};

/**
 * One side of a translation: an object in a document, and the label the translations of its edits name
 * it by (a version for an object's version documents, an object id for an object extracted from one).
 */
export type TranslationSide = {
  doc: VersionDoc;
  objectId: string;
  label: string;
  /** The changes the side's root stands for, when not those that created the object in it. */
  roots?: ReadonlySet<string>;
};

/**
 * Translates every original edit made in `source` that `target` lacks into `target`, and returns the
 * new target: `project` reads the source object's entry as the sections of the target it maps to. An edit
 * waits while the target lacks the image of one of its ancestors, since forking without it would not be
 * deterministic; `settled` records edits already handled, so each is examined once per target.
 *
 * The work per edit is bounded by what the edit touches: the change graphs and images are built once and
 * kept current, an edit's ancestry is walked only down to its nearest translated ancestors, and while
 * translations form a chain each is authored on one working copy instead of a fresh copy of the history.
 */
export const translateBetween = ({
  source,
  target,
  project,
  settled,
}: {
  source: TranslationSide;
  target: TranslationSide;
  project: Projection;
  settled?: Set<string>;
}): VersionDoc => {
  const sourceChanges = A.getChangesMetaSince(source.doc, []);
  const sourceByHash = new Map(sourceChanges.map((change) => [change.hash, change]));
  const sourceGraph: ChangeGraph = new Map(sourceChanges.map((change) => [change.hash, change.deps]));
  const sourceRoots = source.roots ?? rootChangesOf(source.doc, source.objectId, sourceGraph);

  const targetChanges = A.getChangesMetaSince(target.doc, []);
  const targetGraph: ChangeGraph = new Map(targetChanges.map((change) => [change.hash, change.deps]));
  const imageOf = new Map<string, string>();
  for (const change of targetChanges) {
    const translation = parseTranslation(change.message);
    if (translation) {
      imageOf.set(translation.original, change.hash);
    }
  }
  const rootFork = frontierOf(targetGraph, target.roots ?? rootChangesOf(target.doc, target.objectId, targetGraph));

  // Source states by heads: in a chain of edits, one edit's state after is the next one's state before.
  const states = new Map<string, Section[]>();
  const stateAt = (heads: readonly string[]): Section[] => {
    const key = [...heads].sort().join();
    let state = states.get(key);
    if (!state) {
      const view = A.view(source.doc, [...heads]);
      const entry: unknown = plain(view.objects?.[source.objectId]);
      state = project(isRecord(entry) ? entry : undefined, view);
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
    const key = `${change.hash}>${target.label}`;
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
      targetLabel: target.label,
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
    // A section found in the target's state is placed where the target holds it; one it no longer holds is dropped.
    const writes = moves.flatMap(({ at: section, key, previous, next }) => {
      const base = typeof section === 'function' ? section(live) : section;
      const path = base && ['objects', target.objectId, ...base, key];
      return path ? [{ path, previous, next, current: plain(getDeep(live, path)) }] : [];
    });
    const message = translationMessage(change.hash, source.label);
    const probe = A.changeAt(mirror.doc, at, { message, time: 0 }, (draft) => {
      for (const { path, previous, next, current } of writes) {
        applyStructuralEdit(draft, path, previous, next, current);
      }
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
      JSON.stringify({ original: change.hash, target: target.label, fork }),
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
 * ancestors; a change that moves nothing the target holds has no image, and its ancestors stand in for it
 * (a translation included, as one from a third side that touches only what the target lacks).
 */
const forkOf = ({
  change,
  sourceByHash,
  sourceRoots,
  imageOf,
  targetGraph,
  targetLabel,
  movesOf,
  rootFork,
}: {
  change: A.ChangeMetadata;
  sourceByHash: Map<string, A.ChangeMetadata>;
  sourceRoots: ReadonlySet<string>;
  imageOf: Map<string, string>;
  targetGraph: ChangeGraph;
  targetLabel: string;
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
    const image = translation?.source === targetLabel ? original : imageOf.get(original);
    if (image) {
      images.push(image);
    } else if (movesOf(meta).length > 0) {
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
  const actor = hashOf(`${seed}:${rename('')}`);
  return A.encodeChange({ ...decoded, actor, seq: 1, deps: [...deps], ops: JSON.parse(rename(actor)) });
};

/**
 * Whether `edges` are the lenses `doc` was derived with: a derived document records the digest of the lenses
 * from its origin, and a device whose lenses differ stays out. A document an app created designates any.
 */
export const derivedWith = (doc: VersionDoc, edges: readonly Lens.VersionEdge[], typename: string): boolean => {
  const root = rootOf(doc);
  const path = root && Lens.versionPath(edges, typename, root.origin, root.version);
  return !root || (path !== undefined && lensDigest(path) === root.lenses);
};

const designates = (one: VersionDoc, two: VersionDoc, edges: readonly Lens.VersionEdge[], typename: string): boolean =>
  derivedWith(one, edges, typename) && derivedWith(two, edges, typename);
