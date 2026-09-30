//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import { encodedValuesEqual, isRecord } from '../encoded-value.ts';
import { type ChangeGraph, ancestorsOf, applyStructuralEdit, frontierOf } from '../fold-edit.ts';

//
// PROTOTYPE (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md` item 12): one logical object stored as one
// Automerge document per schema version, kept in sync by translating each original edit into every other
// version document a device holds. Plain Automerge documents only, no ECHO integration: it exists to show
// whether the translation rules converge, not to be used.
//
// Rules under test:
// 1. A version document's root is derived from the object's origin root through the lens chain, with a
//    content-derived actor and time 0, so every device that creates it writes the same root.
// 2. Only original edits are translated, never translations, each directly from the document it was made
//    in through the composed lens chain, so intermediate versions need no document.
// 3. A translation is forked at the target's images of the edit's ancestors and authored with an actor
//    derived from its ops, so every device that translates an edit writes the same bytes.
// 4. A device translates only with lenses the space designates, so two builds of one lens never both write.
//

export type Data = Record<string, unknown>;

/** A lens between adjacent versions, identified by `id` (in production, a hash of its definition). */
export type VersionLens = {
  id: string;
  from: number;
  to: number;
  forward: (data: Data) => Data;
  backward: (data: Data) => Data;
};

export type VersionDoc = A.Doc<{ data: Data }>;

const ROOT_MESSAGE = 'version-root';

/** The message a translation of `original` (made in version `source`) is stamped with. */
const translationMessage = (original: string, source: number): string => `translate: ${original} from ${source}`;

const parseTranslation = (message: string | null): { original: string; source: number } | undefined => {
  const match = message?.match(/^translate: (\S+) from (\d+)$/);
  return match ? { original: match[1], source: Number(match[2]) } : undefined;
};

const PROBE_ACTOR = '00000000000000000000000000000000';

const deriveActor = (seed: string): string => bytesToHex(sha256(utf8ToBytes(seed))).slice(0, 32);

/**
 * Authors one change at exactly `heads` under an actor derived from `seed` and the change's own ops, as
 * `ObjectCore.sharedChangeAt` does, and merges it into `doc`.
 */
const sharedChange = (
  doc: VersionDoc,
  heads: Heads,
  mutate: (draft: { data: Data }) => void,
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
  return A.merge(doc, author(deriveActor(`${seed}:${ops}`)).newDoc);
};

/** The data of `doc` as of `heads`, as plain values. */
const dataAt = (doc: VersionDoc, heads: Heads): Data => {
  const data: unknown = A.view(doc, heads).data;
  return isRecord(data) ? JSON.parse(JSON.stringify(data)) : {};
};

/** One device: the version documents it holds and the lenses it can run. */
export class Device {
  readonly docs = new Map<number, VersionDoc>();

  constructor(
    readonly name: string,
    readonly lenses: readonly VersionLens[],
  ) {}

  /** The composed mapping from `from` to `to` through adjacent lenses the space designates, if this device has them all. */
  path(from: number, to: number, designated: ReadonlySet<string>): ((data: Data) => Data) | undefined {
    const steps: ((data: Data) => Data)[] = [];
    for (let version = from; version !== to; version += to > from ? 1 : -1) {
      const next = version + (to > from ? 1 : -1);
      const lens = this.lenses.find(
        (candidate) =>
          designated.has(candidate.id) &&
          ((candidate.from === version && candidate.to === next) ||
            (candidate.from === next && candidate.to === version)),
      );
      if (!lens) {
        return undefined;
      }
      steps.push(lens.from === version ? lens.forward : lens.backward);
    }
    return (data) => steps.reduce((value, step) => step(value), data);
  }

  /**
   * Creates this device's document for `version` from the object's origin document (version `origin`),
   * whose root is the object's first change. Every device derives the same root.
   */
  createVersion(origin: number, version: number, designated: ReadonlySet<string>): void {
    const source = this.docs.get(origin);
    const path = this.path(origin, version, designated);
    if (!source || !path || this.docs.has(version)) {
      return;
    }
    const [root] = A.getChangesMetaSince(source, []);
    const state = path(dataAt(source, [root.hash]));
    const actor = deriveActor(`${root.hash}:${version}:${JSON.stringify(state)}`);
    const created = A.change(A.init<{ data: Data }>({ actor }), { message: ROOT_MESSAGE, time: 0 }, (draft) => {
      draft.data = state;
    });
    // The root's actor is shared by every device that derived it; this device's own edits need its own.
    this.docs.set(version, A.clone(created));
  }

  /** Translates every original edit in each held document into each other held document it can reach. */
  translate(designated: ReadonlySet<string>): number {
    let written = 0;
    for (const [source, sourceDoc] of this.docs) {
      for (const target of [...this.docs.keys()].filter((version) => version !== source)) {
        const path = this.path(source, target, designated);
        if (!path) {
          continue;
        }
        // A document's first change is its root, which every version's root is derived from, not an edit.
        for (const change of A.getChangesMetaSince(sourceDoc, []).slice(1)) {
          if (parseTranslation(change.message)) {
            continue;
          }
          const targetDoc = this.docs.get(target);
          if (!targetDoc) {
            continue;
          }
          const next = translateEdit(sourceDoc, source, targetDoc, target, change, path);
          if (next !== targetDoc) {
            this.docs.set(target, next);
            written++;
          }
        }
      }
    }
    return written;
  }
}

/**
 * Translates one original edit into `targetDoc`, unless it already is, or unless the target lacks the image
 * of one of the edit's ancestors (then it waits, since forking without it would not be deterministic).
 */
const translateEdit = (
  sourceDoc: VersionDoc,
  source: number,
  targetDoc: VersionDoc,
  target: number,
  change: A.ChangeMetadata,
  path: (data: Data) => Data,
): VersionDoc => {
  const targetChanges = A.getChangesMetaSince(targetDoc, []);
  const imageOf = new Map<string, string>();
  for (const candidate of targetChanges) {
    const translation = parseTranslation(candidate.message);
    if (translation) {
      imageOf.set(translation.original, candidate.hash);
    }
  }
  if (imageOf.has(change.hash)) {
    return targetDoc;
  }

  // The image in the target of each ancestor: its root, an original's translation, or an original itself.
  const sourceChanges = A.getChangesMetaSince(sourceDoc, []);
  const sourceGraph: ChangeGraph = new Map(sourceChanges.map((meta) => [meta.hash, meta.deps]));
  const images: string[] = [];
  for (const ancestor of ancestorsOf(sourceGraph, change.deps)) {
    const meta = sourceChanges.find((candidate) => candidate.hash === ancestor);
    if (!meta) {
      return targetDoc;
    }
    const translation = parseTranslation(meta.message);
    const original = translation?.original ?? meta.hash;
    const image =
      meta === sourceChanges[0]
        ? targetChanges[0].hash
        : translation?.source === target
          ? original
          : imageOf.get(original);
    if (image) {
      images.push(image);
    } else if (translation || movedKeys(sourceDoc, meta, path).length > 0) {
      return targetDoc;
    }
    // An original that moves nothing in the target has no image; its own ancestors stand in for it.
  }
  const targetGraph: ChangeGraph = new Map(targetChanges.map((meta) => [meta.hash, meta.deps]));
  const fork = frontierOf(targetGraph, images.length > 0 ? images : [targetChanges[0].hash]);

  const previous = path(dataAt(sourceDoc, [...change.deps]));
  const next = path(dataAt(sourceDoc, [change.hash]));
  const current = dataAt(targetDoc, fork);
  const keys = movedKeys(sourceDoc, change, path);
  if (keys.length === 0) {
    return targetDoc;
  }
  return sharedChange(
    targetDoc,
    fork,
    (draft) => {
      for (const key of keys) {
        applyStructuralEdit(draft, ['data', key], previous[key], next[key], current[key]);
      }
    },
    translationMessage(change.hash, source),
    JSON.stringify({ original: change.hash, target, fork }),
  );
};

/** The target keys `change` moves, through `path`. */
const movedKeys = (sourceDoc: VersionDoc, change: A.ChangeMetadata, path: (data: Data) => Data): string[] => {
  const previous = path(dataAt(sourceDoc, [...change.deps]));
  const next = path(dataAt(sourceDoc, [change.hash]));
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])].filter(
    (key) => !encodedValuesEqual(previous[key], next[key]),
  );
};

/** Merges every version document two devices both hold, both ways. */
export const sync = (devices: readonly Device[]): void => {
  for (const one of devices) {
    for (const two of devices) {
      if (one === two) {
        continue;
      }
      for (const [version, doc] of one.docs) {
        const other = two.docs.get(version);
        if (other) {
          two.docs.set(version, A.merge(other, doc));
        }
      }
    }
  }
};

/** Syncs and translates until a round after a sync writes nothing new. */
export const settle = (devices: readonly Device[], designated: ReadonlySet<string>, rounds = 10): void => {
  for (let round = 0; round < rounds; round++) {
    sync(devices);
    const written = devices.reduce((total, device) => total + device.translate(designated), 0);
    if (written === 0) {
      return;
    }
  }
  throw new Error('version documents did not settle');
};

/** Whether `change` is a translation; exported for assertions. */
export const isTranslation = (message: string | null): boolean => parseTranslation(message) !== undefined;
