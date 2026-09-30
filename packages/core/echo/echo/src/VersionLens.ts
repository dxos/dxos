//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Type from './Type.ts';

//
// A declarative lens between two versions of one type, for version documents: one Automerge document
// per version of an object, kept in sync by translating each edit through the lenses between them.
// Every operation is reversible and a pure function of the data, so every peer holding the same
// definition translates an edit into the same bytes; the definition is plain data, so it can later be
// stored in a space as types are.
//

export const TypeId = '~@dxos/echo/VersionLens' as const;
export type TypeId = typeof TypeId;

/** Properties of one version of an object, as plain values. */
export type Data = Record<string, unknown>;

/** One reversible step between two versions. */
export type Op =
  /** The property is called `to` in the newer version. */
  | { readonly kind: 'rename'; readonly from: string; readonly to: string }
  /** The newer version adds `property`; objects that lack it read `default`. */
  | { readonly kind: 'add'; readonly property: string; readonly default: unknown }
  /** The newer version drops `property`; the older version reads `default` for objects that lack it. */
  | { readonly kind: 'remove'; readonly property: string; readonly default: unknown };

export const rename = (from: string, to: string): Op => ({ kind: 'rename', from, to });

export const add = (property: string, defaultValue: unknown): Op => ({ kind: 'add', property, default: defaultValue });

export const remove = (property: string, defaultValue: unknown): Op => ({
  kind: 'remove',
  property,
  default: defaultValue,
});

/** A lens from one version of a type to the next. */
export interface VersionLens {
  readonly [TypeId]: TypeId;
  /** Canonical form of the definition; two lenses with the same key translate identically. */
  readonly key: string;
  readonly typename: string;
  readonly from: Type.AnyObj;
  readonly to: Type.AnyObj;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly ops: readonly Op[];
  /** Maps data of the older version to the newer one. */
  readonly forward: (data: Data) => Data;
  /** Maps data of the newer version to the older one. */
  readonly backward: (data: Data) => Data;
}

export const isVersionLens = (value: unknown): value is VersionLens =>
  typeof value === 'object' && value !== null && TypeId in value;

/** The registry semver of a declared type, without the heads a stored type carries. */
export const versionOf = (type: Type.AnyObj): string => Type.getVersion(type).split('-')[0];

/** Orders two `major.minor.patch` versions. */
export const compareVersions = (left: string, right: string): number => {
  const [one, two] = [left, right].map((version) => version.split('.').map(Number));
  for (let index = 0; index < 3; index++) {
    if (one[index] !== two[index]) {
      return one[index] - two[index];
    }
  }
  return 0;
};

// Defaults are copied per use: an array or record shared between two results would alias.
const copy = (value: unknown): unknown => (value === undefined ? undefined : structuredClone(value));

const applyForward = (data: Data, op: Op): Data => {
  const next = { ...data };
  switch (op.kind) {
    case 'rename':
      if (op.from in next) {
        next[op.to] = next[op.from];
        delete next[op.from];
      }
      return next;
    case 'add':
      if (next[op.property] === undefined) {
        next[op.property] = copy(op.default);
      }
      return next;
    case 'remove':
      delete next[op.property];
      return next;
  }
};

const invertOp = (op: Op): Op => {
  switch (op.kind) {
    case 'rename':
      return rename(op.to, op.from);
    case 'add':
      return remove(op.property, op.default);
    case 'remove':
      return add(op.property, op.default);
  }
};

/**
 * Defines the lens from `from` to `to`, two versions of one type, as a sequence of reversible ops.
 * Properties no op names carry over unchanged.
 */
export const make = ({ from, to, ops }: { from: Type.AnyObj; to: Type.AnyObj; ops: readonly Op[] }): VersionLens => {
  const typename = Type.getTypename(from);
  if (Type.getTypename(to) !== typename) {
    throw new TypeError(`VersionLens: ${typename} and ${Type.getTypename(to)} are not versions of one type.`);
  }
  const fromVersion = versionOf(from);
  const toVersion = versionOf(to);
  if (compareVersions(fromVersion, toVersion) >= 0) {
    throw new TypeError(`VersionLens: ${typename} ${fromVersion} is not older than ${toVersion}.`);
  }
  const inverse = [...ops].reverse().map(invertOp);
  return {
    [TypeId]: TypeId,
    key: JSON.stringify({ typename, from: fromVersion, to: toVersion, ops }),
    typename,
    from,
    to,
    fromVersion,
    toVersion,
    ops,
    forward: (data) => ops.reduce(applyForward, data),
    backward: (data) => inverse.reduce(applyForward, data),
  };
};

/** A composed mapping between two versions, and the keys of the lenses it runs, in order. */
export type Path = {
  readonly keys: readonly string[];
  readonly apply: (data: Data) => Data;
};

/**
 * The mapping from version `from` to version `to` of `typename` through adjacent `lenses`, or
 * `undefined` when they do not connect. Versions form a chain, so the path is the unique walk
 * between them.
 */
export const findPath = (
  lenses: readonly VersionLens[],
  typename: string,
  from: string,
  to: string,
): Path | undefined => {
  const chain = lenses.filter((lens) => lens.typename === typename);
  const upward = compareVersions(from, to) < 0;
  const steps: ((data: Data) => Data)[] = [];
  const keys: string[] = [];
  let version = from;
  while (version !== to) {
    const lens = upward
      ? chain.find((candidate) => candidate.fromVersion === version)
      : chain.find((candidate) => candidate.toVersion === version);
    if (!lens) {
      return undefined;
    }
    steps.push(upward ? lens.forward : lens.backward);
    keys.push(lens.key);
    version = upward ? lens.toVersion : lens.fromVersion;
    if (compareVersions(version, to) * (upward ? 1 : -1) > 0) {
      return undefined;
    }
  }
  return { keys, apply: (data) => steps.reduce((value, step) => step(value), data) };
};

/** Every version of `typename` the lenses reach, oldest first. */
export const versionsOf = (lenses: readonly VersionLens[], typename: string): string[] => {
  const versions = new Set<string>();
  for (const lens of lenses) {
    if (lens.typename === typename) {
      versions.add(lens.fromVersion);
      versions.add(lens.toVersion);
    }
  }
  return [...versions].sort(compareVersions);
};
