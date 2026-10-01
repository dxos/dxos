//
// Copyright 2026 DXOS.org
//

import { SchemaEx } from '@dxos/effect';

import * as Type from '../../Type.ts';
import { resolveDefaults } from './identity.ts';
import { findPath } from './path.ts';
import { type AnyLens } from './types.ts';

//
// A lens between two versions of one type also translates version documents (DESIGN.md §12.7): the same
// mapping, run over plain data in both directions. Only the subset every device runs identically and that
// runs backward qualifies — same-name matches and renames, with defaults for properties one side lacks.
//

/** Properties of one version of an object, as plain values. */
export type Data = Record<string, unknown>;

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

type VersionLens = AnyLens & { readonly target: Type.AnyObj };

/** Whether `lens` connects two versions of one type, older to newer. */
export const isVersionLens = (lens: AnyLens): lens is VersionLens => {
  const { source, target } = lens;
  return (
    Type.isType(target) &&
    Type.isObject(target) &&
    Type.isObject(source) &&
    Type.getTypename(source) === Type.getTypename(target) &&
    compareVersions(versionOf(source), versionOf(target)) < 0
  );
};

type Step = { readonly forward: (data: Data) => Data; readonly backward: (data: Data) => Data };

// Defaults are copied per use: an array or record shared between two results would alias.
const copy = (value: unknown): unknown => (value === undefined ? undefined : structuredClone(value));

const requiredNames = (type: Type.AnyObj): Set<string> =>
  new Set(
    SchemaEx.getProperties(Type.getSchema(type).ast)
      .filter((property) => !property.isOptional)
      .map((property) => String(property.name)),
  );

const propertyNames = (type: Type.AnyObj): Set<string> =>
  new Set(SchemaEx.getProperties(Type.getSchema(type).ast).map((property) => String(property.name)));

/**
 * The plain-data translation `lens` runs in each direction. Throws, naming every offending property,
 * when the lens is not in the subset version documents accept.
 */
export const versionStep = (lens: AnyLens): Step => {
  if (!isVersionLens(lens)) {
    throw new TypeError(`Lens: "${lens.id}" does not connect an older version of one type to a newer one.`);
  }
  const { plan, source, target } = lens;
  if (!plan) {
    throw new TypeError(`Lens: "${lens.id}" is coded; version documents need a declarative lens.`);
  }
  const defaults = resolveDefaults(source, target, plan, lens.defaults);
  const problems: string[] = [];
  const claimed = new Set<string>();
  const pairs: (readonly [to: string, from: string])[] = [];
  for (const entry of plan.entries) {
    const [from] = entry.from;
    const declarative = entry.origin === 'automatic' || entry.serialized?.kind === 'rename';
    if (!declarative || entry.from.length !== 1 || from === undefined || claimed.has(from)) {
      problems.push(`"${entry.property}" is not a rename or a same-name match`);
      continue;
    }
    claimed.add(from);
    pairs.push([entry.property, from]);
  }
  for (const { property } of plan.coverage.suspicious) {
    problems.push(`"${property}" has the same name as a source property of an incompatible type`);
  }
  const targetRequired = requiredNames(target);
  const sourceRequired = requiredNames(source);
  const targetOnly = plan.overlays;
  const sourceOnly = plan.coverage.dropped;
  for (const name of targetOnly) {
    if (targetRequired.has(name) && !(name in defaults)) {
      problems.push(`"${name}" is required in ${Type.getURI(target)} and has no default`);
    }
  }
  for (const name of sourceOnly) {
    if (sourceRequired.has(name) && !(name in defaults)) {
      problems.push(`"${name}" is required in ${Type.getURI(source)} and has no default`);
    }
  }
  if (problems.length > 0) {
    throw new TypeError(`Lens: "${lens.id}" cannot translate version documents: ${problems.join('; ')}.`);
  }

  const sourceNames = propertyNames(source);
  const targetNames = propertyNames(target);
  // Properties neither schema declares carry over unchanged, as they would in one document.
  const run = (
    data: Data,
    known: Set<string>,
    mapped: readonly (readonly [string, string])[],
    added: readonly string[],
  ): Data => {
    const next: Data = Object.fromEntries(Object.entries(data).filter(([key]) => !known.has(key)));
    for (const [to, from] of mapped) {
      if (data[from] !== undefined) {
        next[to] = data[from];
      }
    }
    for (const name of added) {
      if (next[name] === undefined && name in defaults) {
        next[name] = copy(defaults[name]);
      }
    }
    return next;
  };
  const reversed = pairs.map(([to, from]) => [from, to] as const);
  return {
    forward: (data) => run(data, sourceNames, pairs, targetOnly),
    backward: (data) => run(data, targetNames, reversed, sourceOnly),
  };
};

/** A composed mapping between two versions, and the digests of the lenses it runs, in order. */
export type VersionPath = {
  readonly digests: readonly string[];
  readonly apply: (data: Data) => Data;
};

/** The declared type of `version` of `typename` among the endpoints of `lenses`. */
export const typeOfVersion = (lenses: readonly AnyLens[], typename: string, version: string): Type.AnyObj | undefined =>
  lenses
    .filter(isVersionLens)
    .flatMap((lens) => [lens.source, lens.target])
    .find((type) => Type.getTypename(type) === typename && versionOf(type) === version);

/**
 * The mapping from version `from` to version `to` of `typename`, over the lenses between versions of that
 * type, or `undefined` when they do not connect. A hop against a lens's direction runs it backward and is
 * identified by the same digest.
 */
export const versionPath = (
  lenses: readonly AnyLens[],
  typename: string,
  from: string,
  to: string,
): VersionPath | undefined => {
  const chain = lenses.filter(isVersionLens).filter((lens) => Type.getTypename(lens.source) === typename);
  const start = typeOfVersion(chain, typename, from);
  const goal = typeOfVersion(chain, typename, to);
  const path = start && goal ? findPath(start, goal, chain) : undefined;
  if (!path) {
    return undefined;
  }
  const hops = path.map((lens) => {
    const original = lens.reverseOf ?? lens;
    const step = versionStep(original);
    return { digest: original.digest, run: lens.reverseOf ? step.backward : step.forward };
  });
  return {
    digests: hops.map((hop) => hop.digest),
    apply: (data) => hops.reduce((value, hop) => hop.run(value), data),
  };
};

/** Every version of `typename` the lenses reach, oldest first. */
export const versionsOf = (lenses: readonly AnyLens[], typename: string): string[] =>
  [
    ...new Set(
      lenses
        .filter(isVersionLens)
        .filter((lens) => Type.getTypename(lens.source) === typename)
        .flatMap((lens) => [versionOf(lens.source), versionOf(lens.target)]),
    ),
  ].sort(compareVersions);
