//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc, type Heads } from '@automerge/automerge';

//
// Reading the history of an object's version documents (`.agents/projects/lenses/DESIGN.md` §12): the
// change graph, which changes stand for the object's creation, and which are translations of an edit made
// in another version. Shared by the version runner, which writes translations, and by branching, which
// forks every version of an object at matching points.
//

/** Each change's deps, by change hash. */
export type ChangeGraph = Map<string, readonly string[]>;

/** The change graph of `doc`. */
export const changeGraphOf = (doc: Doc<unknown>): ChangeGraph =>
  new Map(A.getChangesMetaSince(doc, []).map((change) => [change.hash, change.deps]));

/** `hashes` and every change they depend on. */
export const ancestorsOf = (graph: ChangeGraph, hashes: Iterable<string>): Set<string> => {
  const seen = new Set<string>();
  const stack = [...hashes];
  for (let hash = stack.pop(); hash !== undefined; hash = stack.pop()) {
    if (!seen.has(hash)) {
      seen.add(hash);
      stack.push(...(graph.get(hash) ?? []));
    }
  }
  return seen;
};

/** The heads `hashes` span: each one no other of them depends on, sorted so equal sets compare equal. */
export const frontierOf = (graph: ChangeGraph, hashes: Iterable<string>): Heads => {
  const unique = [...new Set(hashes)];
  const covered = ancestorsOf(
    graph,
    unique.flatMap((hash) => graph.get(hash) ?? []),
  );
  return unique.filter((hash) => !covered.has(hash)).sort();
};

/** The message a translation of `original` (an edit made in version `source`) is stamped with. */
export const translationMessage = (original: string, source: string): string => `translate: ${original} from ${source}`;

export const parseTranslation = (message: string | null): { original: string; source: string } | undefined => {
  const match = message?.match(/^translate: (\S+) from (\S+)$/);
  return match ? { original: match[1], source: match[2] } : undefined;
};

/** Whether a change message marks a translation. */
export const isTranslation = (message: string | null): boolean => parseTranslation(message) !== undefined;

type DirectoryDoc = Doc<{ objects?: Record<string, unknown> }>;

/**
 * The change that created the object in `doc`: the first, in causal order, whose state holds it. Only
 * that change's descendants can hold it, so the first found has no ancestor that does.
 */
export const creationChange = (doc: DirectoryDoc, objectId: string): A.ChangeMetadata | undefined =>
  A.getChangesMetaSince(doc, []).find((change) => A.view(doc, [change.hash]).objects?.[objectId] !== undefined);

/**
 * The changes of `doc` that stand for the object's creation: a derived document's root, else the creation
 * change and every change before it.
 */
export const rootChangesOf = (doc: DirectoryDoc, objectId: string, graph: ChangeGraph): Set<string> => {
  const creation = creationChange(doc, objectId);
  return creation ? new Set([creation.hash, ...ancestorsOf(graph, creation.deps)]) : new Set();
};

/**
 * The heads of `target`, another version document of the object, that hold what `source` holds at
 * `heads`: its root, and every edit, or translation of an edit, that `source` holds there.
 */
export const imageHeads = (source: DirectoryDoc, heads: Heads, target: DirectoryDoc, objectId: string): Heads => {
  const sourceChanges = new Map(A.getChangesMetaSince(source, []).map((change) => [change.hash, change]));
  const originals = new Set(
    [...ancestorsOf(changeGraphOf(source), heads)].map(
      (hash) => parseTranslation(sourceChanges.get(hash)?.message ?? null)?.original ?? hash,
    ),
  );
  const targetGraph = changeGraphOf(target);
  const roots = rootChangesOf(target, objectId, targetGraph);
  const included = A.getChangesMetaSince(target, [])
    .filter(
      (change) => roots.has(change.hash) || originals.has(parseTranslation(change.message)?.original ?? change.hash),
    )
    .map((change) => change.hash);
  return frontierOf(targetGraph, included);
};
