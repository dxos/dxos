//
// Copyright 2026 DXOS.org
//

//
// Versioned reads (VIEWS.md §8.4): an undo entry holds a source's heads before and after a change and the paths the
// change wrote, not the values, and reads the values back at those heads when it is undone or redone. The memory
// store's heads are its immutable snapshots; an ECHO-backed store's are its documents' Automerge heads.
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

/** A path of keys into a plain value: for a store, `[viewId, 'nodes', nodeId, 'center', 'x']`. */
export type VersionPath = readonly string[];

/** One value to write at `path`; `undefined` deletes the key. */
export type VersionWrite = { readonly path: VersionPath; readonly value: unknown };

/** Something whose past can be read back: the store, or a projection's own model. */
export type VersionedSource<Heads = unknown> = {
  /** The current version; opaque, and only ever passed back to `read`. */
  heads: () => Heads;
  /** The value at `path`, now or at `heads`; undefined where the path does not exist. */
  read: (path: VersionPath, heads?: Heads) => unknown;
  /** Writes every value in one change, so a patch is one edit to its subscribers. */
  write: (writes: readonly VersionWrite[]) => void;
};

/** A change to one source: its heads either side and the paths it wrote. */
export type VersionChange<Heads = unknown> = {
  readonly before: Heads;
  readonly after: Heads;
  readonly paths: readonly VersionPath[];
};

/** How a patch went: paths written, already at their target, and skipped as changed by someone else since. */
export type PatchResult = { written: number; unchanged: number; skipped: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

/** The value at `path` in `value`. */
export const readPath = (value: unknown, path: VersionPath): unknown => {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = Reflect.get(current, key);
  }
  return current;
};

/** `value` with `next` at `path`, copying only the records along it; `undefined` deletes the key. */
export const writePath = (value: unknown, path: VersionPath, next: unknown): unknown => {
  if (path.length === 0) {
    return next;
  }
  const [key, ...rest] = path;
  const record = isRecord(value) ? value : {};
  const child = writePath(record[key], rest, next);
  if (child === undefined) {
    if (!(key in record)) {
      return record;
    }
    const { [key]: _, ...without } = record;
    return without;
  }
  return record[key] === child ? record : { ...record, [key]: child };
};

/** Structural equality over plain records and arrays; anything else (a reference, a date) compares by its JSON. */
export const sameValue = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((entry, index) => sameValue(entry, right[index]));
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = Object.keys(left).filter((key) => left[key] !== undefined);
    return (
      keys.length === Object.keys(right).filter((key) => right[key] !== undefined).length &&
      keys.every((key) => sameValue(left[key], right[key]))
    );
  }
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
};

/**
 * The leaf paths whose values differ between `before` and `after`: records are walked key by key and anything else
 * (an array, a number) is a leaf, so a moved node writes `center.x` and `center.y` and concurrent edits to its other
 * fields survive an undo.
 */
export const diffPaths = (before: unknown, after: unknown, prefix: VersionPath = []): VersionPath[] => {
  if (before === after) {
    return [];
  }
  if (!isRecord(before) || !isRecord(after)) {
    return sameValue(before, after) ? [] : [prefix];
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].flatMap((key) => diffPaths(before[key], after[key], [...prefix, key]));
};

/** Paths in `left` and `right`, each once. */
export const unionPaths = (left: readonly VersionPath[], right: readonly VersionPath[]): VersionPath[] => {
  const seen = new Set(left.map((path) => JSON.stringify(path)));
  return [...left, ...right.filter((path) => !seen.has(JSON.stringify(path)))];
};

/**
 * Moves each of `paths` from its value at `from` to its value at `to` (VIEWS.md §8.3 Q4, §8.4.2): a path still at its
 * `from` value is written, one already at `to` is left, and one someone else has changed since is skipped, so undo
 * (after → before) and redo (before → after) never overwrite a concurrent edit.
 */
export const patchSource = <Heads>(
  source: VersionedSource<Heads>,
  { from, to, paths }: { from: Heads; to: Heads; paths: readonly VersionPath[] },
): PatchResult => {
  const writes: VersionWrite[] = [];
  let unchanged = 0;
  let skipped = 0;
  for (const path of paths) {
    const current = source.read(path);
    const target = source.read(path, to);
    if (sameValue(current, target)) {
      unchanged++;
    } else if (sameValue(current, source.read(path, from))) {
      writes.push({ path, value: target });
    } else {
      skipped++;
    }
  }
  if (writes.length > 0) {
    source.write(writes);
  }
  return { written: writes.length, unchanged, skipped };
};

/**
 * Runs `change` and reports what it did to each source: its heads either side and the paths it wrote; undefined
 * for a source it left alone (a refused intent writes nothing).
 */
export const recordChanges = <Sources extends readonly VersionedSource[]>(
  sources: Sources,
  change: () => void,
): (VersionChange | undefined)[] => {
  const before = sources.map((source) => ({ heads: source.heads(), value: source.read([]) }));
  change();
  return sources.map((source, index) => {
    const value = source.read([]);
    const paths = value === before[index].value ? [] : diffPaths(before[index].value, value);
    return paths.length > 0 ? { before: before[index].heads, after: source.heads(), paths } : undefined;
  });
};

/** An atom as a versioned source: its heads are its values, which the registry never mutates. */
export const atomSource = <Value>(
  registry: Registry.AtomRegistry,
  atom: Atom.Writable<Value>,
  accept: (value: unknown) => value is Value,
): VersionedSource => ({
  heads: () => registry.get(atom),
  read: (path, heads) => readPath(heads === undefined ? registry.get(atom) : heads, path),
  write: (writes) => {
    const next = writes.reduce<unknown>(
      (value, { path, value: entry }) => writePath(value, path, entry),
      registry.get(atom),
    );
    if (accept(next)) {
      registry.set(atom, next);
    }
  },
});

/** A versioned source over several, each under its own key, for a projection whose model spans atoms. */
export const combinedSource = (sources: Readonly<Record<string, VersionedSource>>): VersionedSource => ({
  heads: () => Object.fromEntries(Object.entries(sources).map(([key, source]) => [key, source.heads()])),
  read: (path, heads) => {
    const at = (key: string) => (heads === undefined ? undefined : readPath(heads, [key]));
    if (path.length === 0) {
      return Object.fromEntries(Object.entries(sources).map(([key, source]) => [key, source.read([], at(key))]));
    }
    const [key, ...rest] = path;
    return sources[key]?.read(rest, at(key));
  },
  write: (writes) => {
    for (const [key, source] of Object.entries(sources)) {
      const own = writes
        .filter(({ path }) => path[0] === key)
        .map(({ path, value }) => ({ path: path.slice(1), value }));
      if (own.length > 0) {
        source.write(own);
      }
    }
  },
});
