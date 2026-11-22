//
// Copyright 2026 DXOS.org
//

import { DXN, URI } from '@dxos/keys';

import * as Type from '../../Type.ts';
import { storedPlan } from './entity.ts';
import { mapShape, serializePlan } from './mapping.ts';
import { evaluate } from './one-way.ts';
import { type AnyLens, type LinkShape, type Plan, type SerializedPlan, type Shape } from './types.ts';

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
  /** The structs the newer version keeps in objects of their own. */
  readonly links: readonly VersionLink[];
};

/**
 * A property of one version that another object holds in the other:
 * - `struct`: the newer version's `property` references a `child` object whose data `forward` derives from the
 *   older version's struct `from`;
 * - `each`: the same, with one reference per element of the list of structs `from`;
 * - `absorb`: the older version's `from` references a `child` object whose data `forward` maps into the newer
 *   version's struct `property`.
 */
export type VersionLink = {
  readonly property: string;
  readonly from: string;
  readonly shape: LinkShape;
  /** URI of the child object's type. */
  readonly child: URI.URI;
  readonly forward: (struct: Data) => Data;
  readonly backward: (data: Data) => Data;
};

type Step = {
  readonly forward: (data: Data) => Data;
  readonly backward: (data: Data) => Data;
  readonly links: readonly VersionLink[];
};

// Defaults are copied per use: an array or record shared between two results would alias.
const copy = (value: unknown): unknown => (value === undefined ? undefined : structuredClone(value));

/**
 * The step a plan as data runs in each direction, or `undefined` when it converts a value through a codec,
 * which is code. Properties neither version declares carry over unchanged, as they would in one document.
 * A one-way entry (a built-in transform or a read-only projection) runs forward only: its target property is
 * dropped going back, and the source properties only it reads keep the value the older version holds.
 */
const stepOf = (plan: SerializedPlan): Step | undefined => {
  type Pair = { to: string; from: string; shape?: Shape; inner?: Step };
  type Forward = { to: string; from: readonly string[]; compute: (data: Data) => unknown };
  const pairs: Pair[] = [];
  const oneWay: Forward[] = [];
  const links: VersionLink[] = [];
  for (const entry of plan.entries) {
    switch (entry.kind) {
      case 'extract': {
        const inner = stepOf(entry.inner);
        if (!inner) {
          return undefined;
        }
        links.push({
          property: entry.property,
          from: entry.from,
          shape: entry.shape,
          child: URI.make(entry.child),
          forward: inner.forward,
          backward: inner.backward,
        });
        break;
      }
      case 'absorb': {
        const inner = stepOf(entry.inner);
        if (!inner) {
          return undefined;
        }
        links.push({
          property: entry.property,
          from: entry.from,
          shape: 'absorb',
          child: URI.make(entry.child),
          forward: inner.forward,
          backward: inner.backward,
        });
        break;
      }
      case 'rename':
        pairs.push({ to: entry.property, from: entry.from });
        break;
      case 'nested': {
        const inner = stepOf(entry.inner);
        if (!inner) {
          return undefined;
        }
        pairs.push({ to: entry.property, from: entry.from, shape: entry.shape, inner });
        break;
      }
      case 'readOnly': {
        const from = entry.from;
        oneWay.push({ to: entry.property, from: [from], compute: (data) => data[from] });
        break;
      }
      case 'oneWay': {
        const spec = entry.spec;
        oneWay.push({ to: entry.property, from: spec.from, compute: (data) => evaluate(spec, data) });
        break;
      }
      case 'converted':
        return undefined;
    }
  }
  const paired = new Set(pairs.map(({ from }) => from));
  // Read only one way: a one-way transform's inputs, and a struct or reference another object carries.
  const oneWayInputs = [...new Set([...oneWay.flatMap(({ from }) => from), ...links.map(({ from }) => from)])].filter(
    (name) => !paired.has(name),
  );
  const sourceOnly = [...plan.dropped, ...oneWayInputs];
  const sourceNames = new Set([...paired, ...sourceOnly]);
  const targetNames = new Set([
    ...pairs.map(({ to }) => to),
    ...oneWay.map(({ to }) => to),
    ...links.map(({ property }) => property),
    ...plan.overlays,
  ]);
  const withDefaults = (next: Data, names: readonly string[]): Data => {
    for (const name of names) {
      if (next[name] === undefined && name in plan.defaults) {
        next[name] = copy(plan.defaults[name]);
      }
    }
    return next;
  };
  const carried = (data: Data, known: ReadonlySet<string>): Data =>
    Object.fromEntries(Object.entries(data).filter(([key]) => !known.has(key)));
  return {
    links,
    forward: (data) => {
      const next = carried(data, sourceNames);
      for (const { to, from, shape, inner } of pairs) {
        const value = data[from];
        if (value !== undefined) {
          next[to] = shape && inner ? mapShape(shape, value, (element) => inner.forward(element)) : value;
        }
      }
      for (const { to, compute } of oneWay) {
        const value = compute(data);
        if (value !== undefined) {
          next[to] = value;
        }
      }
      return withDefaults(next, plan.overlays);
    },
    backward: (data) => {
      const next = carried(data, targetNames);
      for (const { to, from, shape, inner } of pairs) {
        const value = data[to];
        if (value !== undefined) {
          next[from] = shape && inner ? mapShape(shape, value, (element) => inner.backward(element)) : value;
        }
      }
      return withDefaults(next, sourceOnly);
    },
  };
};

const edgeOf = (
  { name, source, target, digest }: { name: string; source: string; target: string; digest: string },
  plan: SerializedPlan,
): VersionEdge | undefined => {
  const older = parseTypeURI(source);
  const newer = parseTypeURI(target);
  const step = stepOf(plan);
  if (
    !step ||
    !older ||
    !newer ||
    older.typename !== newer.typename ||
    compareVersions(older.version, newer.version) >= 0
  ) {
    return undefined;
  }
  return {
    name,
    typename: older.typename,
    source: URI.make(source),
    target: URI.make(target),
    from: older.version,
    to: newer.version,
    digest,
    ...step,
  };
};

/** What keeps `plan` out of version documents, naming each property by its path. */
const problemsOf = (plan: Plan, path: string): string[] => {
  const problems: string[] = [];
  const readByPair = new Set<string>();
  const readOneWay = new Set<string>();
  for (const entry of plan.entries) {
    const at = `"${path}${entry.property}"`;
    if (entry.link) {
      const arrow = { struct: '->', each: '[]->', absorb: '<-' }[entry.link.shape];
      problems.push(...problemsOf(entry.link.plan, `${path}${entry.property}${arrow}`));
      entry.from.forEach((name) => readOneWay.add(name));
    } else if (entry.nested) {
      problems.push(
        ...problemsOf(entry.nested.plan, `${path}${entry.property}${entry.nested.shape === 'struct' ? '' : '[]'}.`),
      );
      entry.from.forEach((name) => readByPair.add(name));
    } else if (entry.oneWay || entry.serialized?.kind === 'readOnly') {
      entry.from.forEach((name) => readOneWay.add(name));
    } else if (entry.origin === 'automatic' || entry.serialized?.kind === 'rename') {
      const [from] = entry.from;
      if (from === undefined || readByPair.has(from)) {
        problems.push(`${at} reads a property another entry also maps`);
      }
      entry.from.forEach((name) => readByPair.add(name));
    } else {
      problems.push(`${at} runs code; version documents need a rename, a nested mapping or a built-in transform`);
    }
  }
  for (const { property } of plan.coverage.suspicious) {
    problems.push(`"${path}${property}" has the same name as a source property of an incompatible type`);
  }
  const missingDefault = (names: Iterable<string>, required: readonly string[], side: string) => {
    for (const name of names) {
      if (required.includes(name) && !(name in plan.defaults)) {
        problems.push(`"${path}${name}" is required in the ${side} version and has no default`);
      }
    }
  };
  missingDefault(plan.overlays, plan.required.target, 'newer');
  missingDefault(
    [...plan.coverage.dropped, ...[...readOneWay].filter((name) => !readByPair.has(name))],
    plan.required.source,
    'older',
  );
  return problems;
};

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
  const problems = problemsOf(plan, '');
  const serialized = serializePlan(plan);
  const edge =
    problems.length === 0 && serialized
      ? edgeOf(
          { name: lens.name, source: Type.getURI(source), target: Type.getURI(target), digest: lens.digest },
          serialized,
        )
      : undefined;
  if (!edge) {
    throw new TypeError(`Lens: "${lens.name}" cannot translate version documents: ${problems.join('; ')}.`);
  }
  return edge;
};

/**
 * The version-document step a stored lens runs, given its data as read from a document, or `undefined` when
 * the data is not a stored lens, does not connect an older version of one type to a newer one, or converts a
 * value through a codec. Its subset was checked when it was stored from code.
 */
export const storedVersionEdge = (data: unknown): VersionEdge | undefined => {
  const decoded = storedPlan(data);
  return decoded && edgeOf(decoded.stored, decoded.plan);
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
