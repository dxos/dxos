//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { SchemaEx } from '@dxos/effect';
import { DXN, URI } from '@dxos/keys';

import * as Type from '../../Type.ts';
import { StoredData } from './entity.ts';
import { resolveDefaults } from './identity.ts';
import { type AnyLens } from './types.ts';

//
// A lens between two versions of one type also translates version documents (DESIGN.md §12.7): the same
// mapping, run over plain data in both directions. Only the subset every device runs identically and that
// runs backward qualifies — same-name matches and renames, with defaults for properties one side lacks.
//
// Translation runs on plain data identified by type URIs, so a host can run a lens it holds only as a
// stored record, without the types it connects: a lens becomes a {@link VersionEdge}.
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

/** The typename and version a type URI names. */
const parseTypeURI = (uri: string): { typename: string; version: string } | undefined => {
  const dxn = DXN.tryMake(uri);
  const version = dxn && DXN.getVersion(dxn);
  return dxn && version ? { typename: DXN.getName(dxn), version: version.split('-')[0] } : undefined;
};

/** Whether `lens` connects two versions of one type, older to newer. */
export const isVersionLens = (lens: AnyLens): lens is AnyLens & { readonly target: Type.AnyObj } => {
  const { source, target } = lens;
  return (
    Type.isType(target) &&
    Type.isObject(target) &&
    Type.isObject(source) &&
    Type.getTypename(source) === Type.getTypename(target) &&
    compareVersions(versionOf(source), versionOf(target)) < 0
  );
};

/** What translating between two versions needs, as plain data. */
type Spec = {
  /** `[target property, source property]` for every property both versions hold. */
  readonly pairs: readonly (readonly [string, string])[];
  readonly targetOnly: readonly string[];
  readonly sourceOnly: readonly string[];
  readonly defaults: Readonly<Record<string, unknown>>;
};

/** One step between two versions of a type: a version-document lens as plain data. */
export type VersionEdge = {
  readonly name: string;
  readonly typename: string;
  /** URI of the older version's type. */
  readonly source: URI.URI;
  /** URI of the newer version's type. */
  readonly target: URI.URI;
  readonly from: string;
  readonly to: string;
  readonly digest: string;
  readonly forward: (data: Data) => Data;
  readonly backward: (data: Data) => Data;
};

// Defaults are copied per use: an array or record shared between two results would alias.
const copy = (value: unknown): unknown => (value === undefined ? undefined : structuredClone(value));

/** Properties neither version declares carry over unchanged, as they would in one document. */
const run = (
  data: Data,
  known: ReadonlySet<string>,
  mapped: readonly (readonly [string, string])[],
  added: readonly string[],
  defaults: Readonly<Record<string, unknown>>,
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

const edgeOf = (
  { name, source, target, digest }: { name: string; source: string; target: string; digest: string },
  spec: Spec,
): VersionEdge | undefined => {
  const older = parseTypeURI(source);
  const newer = parseTypeURI(target);
  if (!older || !newer || older.typename !== newer.typename || compareVersions(older.version, newer.version) >= 0) {
    return undefined;
  }
  const sourceNames = new Set([...spec.pairs.map(([, property]) => property), ...spec.sourceOnly]);
  const targetNames = new Set([...spec.pairs.map(([property]) => property), ...spec.targetOnly]);
  const reversed = spec.pairs.map(([property, from]) => [from, property] as const);
  return {
    name,
    typename: older.typename,
    source: URI.make(source),
    target: URI.make(target),
    from: older.version,
    to: newer.version,
    digest,
    forward: (data) => run(data, sourceNames, spec.pairs, spec.targetOnly, spec.defaults),
    backward: (data) => run(data, targetNames, reversed, spec.sourceOnly, spec.defaults),
  };
};

const requiredNames = (type: Type.AnyObj): Set<string> =>
  new Set(
    SchemaEx.getProperties(Type.getSchema(type).ast)
      .filter((property) => !property.isOptional)
      .map((property) => String(property.name)),
  );

/**
 * The version-document step `lens` runs. Throws, naming every offending property, when the lens is not
 * in the subset version documents accept.
 */
export const versionEdge = (lens: AnyLens): VersionEdge => {
  if (!isVersionLens(lens)) {
    throw new TypeError(`Lens: "${lens.name}" does not connect an older version of one type to a newer one.`);
  }
  const { plan, source, target } = lens;
  if (!plan) {
    throw new TypeError(`Lens: "${lens.name}" is coded; version documents need a declarative lens.`);
  }
  const defaults = resolveDefaults(source, target, plan, lens.defaults);
  const problems: string[] = [];
  const claimed = new Set<string>();
  const pairs: (readonly [string, string])[] = [];
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
  for (const name of plan.overlays) {
    if (targetRequired.has(name) && !(name in defaults)) {
      problems.push(`"${name}" is required in ${Type.getURI(target)} and has no default`);
    }
  }
  for (const name of plan.coverage.dropped) {
    if (sourceRequired.has(name) && !(name in defaults)) {
      problems.push(`"${name}" is required in ${Type.getURI(source)} and has no default`);
    }
  }
  const edge =
    problems.length === 0
      ? edgeOf(
          { name: lens.name, source: Type.getURI(source), target: Type.getURI(target), digest: lens.digest },
          { pairs, targetOnly: plan.overlays, sourceOnly: plan.coverage.dropped, defaults },
        )
      : undefined;
  if (!edge) {
    throw new TypeError(`Lens: "${lens.name}" cannot translate version documents: ${problems.join('; ')}.`);
  }
  return edge;
};

/**
 * The version-document step a stored lens runs, given its data as read from a document, or `undefined` when
 * the data is not a stored lens, does not connect an older version of one type to a newer one, or maps a
 * property other than by rename. Its subset was checked when it was stored from code.
 */
export const storedVersionEdge = (data: unknown): VersionEdge | undefined => {
  const decoded = Schema.decodeUnknownOption(StoredData)(data);
  if (Option.isNone(decoded)) {
    return undefined;
  }
  const stored = decoded.value;
  if (stored.entries.some((entry) => entry.kind !== 'rename')) {
    return undefined;
  }
  const defaults: unknown = JSON.parse(stored.defaults);
  return edgeOf(stored, {
    pairs: stored.entries.map((entry) => [entry.property, entry.from] as const),
    targetOnly: stored.overlays,
    sourceOnly: stored.dropped,
    defaults: typeof defaults === 'object' && defaults !== null ? { ...defaults } : {},
  });
};

/** A composed mapping between two versions, and the digests of the steps it runs, in order. */
export type VersionPath = {
  readonly digests: readonly string[];
  readonly apply: (data: Data) => Data;
};

/** The type URI of `version` of `typename` among the endpoints of `edges`. */
export const typeOfVersion = (edges: readonly VersionEdge[], typename: string, version: string): URI.URI | undefined =>
  edges
    .filter((edge) => edge.typename === typename)
    .flatMap((edge) => [
      { version: edge.from, uri: edge.source },
      { version: edge.to, uri: edge.target },
    ])
    .find((endpoint) => endpoint.version === version)?.uri;

/**
 * The mapping from version `from` to version `to` of `typename`, or `undefined` when `edges` do not connect
 * them: the shortest walk, either way along each step, ties broken by digest so every device holding the
 * same steps walks the same one. A step walked from newer to older runs backward under the same digest.
 */
export const versionPath = (
  edges: readonly VersionEdge[],
  typename: string,
  from: string,
  to: string,
): VersionPath | undefined => {
  type Hop = { readonly edge: VersionEdge; readonly forward: boolean };
  const chain = edges.filter((edge) => edge.typename === typename);
  const key = (hops: readonly Hop[]) => hops.map(({ edge }) => edge.digest).join('\n');
  let frontier = new Map<string, readonly Hop[]>([[from, []]]);
  const visited = new Set([from]);
  while (frontier.size > 0 && !frontier.has(to)) {
    const next = new Map<string, readonly Hop[]>();
    for (const [version, hops] of frontier) {
      for (const edge of chain) {
        const forward = edge.from === version;
        const reached = forward ? edge.to : edge.to === version ? edge.from : undefined;
        if (reached === undefined || visited.has(reached)) {
          continue;
        }
        const candidate = [...hops, { edge, forward }];
        const existing = next.get(reached);
        if (!existing || key(candidate) < key(existing)) {
          next.set(reached, candidate);
        }
      }
    }
    for (const version of next.keys()) {
      visited.add(version);
    }
    frontier = next;
  }
  const hops = frontier.get(to);
  return (
    hops && {
      digests: hops.map(({ edge }) => edge.digest),
      apply: (data) => hops.reduce((value, { edge, forward }) => (forward ? edge.forward : edge.backward)(value), data),
    }
  );
};

/** Every version of `typename` the steps reach, oldest first. */
export const versionsOf = (edges: readonly VersionEdge[], typename: string): string[] =>
  [...new Set(edges.filter((edge) => edge.typename === typename).flatMap((edge) => [edge.from, edge.to]))].sort(
    compareVersions,
  );
