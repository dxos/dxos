//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { SchemaAST, SchemaEx } from '@dxos/effect';

import * as Type from '../../Type.ts';
import { getCodec } from './codecs.ts';
import { evaluate } from './one-way.ts';
import {
  type Codec,
  type Converted,
  type Derived,
  type Mapping,
  type Nested,
  type OneWay,
  type Plan,
  type ResolvedEntry,
  type SerializedEntry,
  type SerializedPlan,
  type Shape,
} from './types.ts';

/** `id` is identity, never lensed, so it never participates in a top-level mapping. */
const RESERVED = new Set(['id']);

const properties = (entity: Type.AnyObj | Schema.Top): SchemaEx.SchemaProperty[] => {
  const schema = Type.isType(entity) ? Type.getSchema(entity) : entity;
  return SchemaEx.getProperties(schema.ast).filter((property) => !RESERVED.has(String(property.name)));
};

/** The struct a nested mapping applies to inside a property of type `ast`. */
const innerAst = (ast: SchemaAST.AST, shape: Shape): SchemaAST.AST | undefined => {
  const type = SchemaEx.unwrapOptional(ast);
  switch (shape) {
    case 'struct':
      return type;
    case 'each':
      return SchemaEx.getArrayElementType(type);
    case 'values':
      return SchemaAST.isObjects(type) ? type.indexSignatures[0]?.type : undefined;
  }
};

const literals = (ast: SchemaAST.AST): readonly SchemaAST.LiteralValue[] | undefined => {
  if (SchemaAST.isLiteral(ast)) {
    return [ast.literal];
  }
  if (SchemaAST.isUnion(ast) && ast.types.every(SchemaAST.isLiteral)) {
    return ast.types.map((member) => (member as SchemaAST.Literal).literal);
  }
  return undefined;
};

const sameLiterals = (a: readonly SchemaAST.LiteralValue[], b: readonly SchemaAST.LiteralValue[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  // Tagged with the runtime type so the number 1 and the string '1' stay distinct vocabularies, and
  // JSON-encoded so the separator cannot collide with a character inside a literal.
  const encode = (values: readonly SchemaAST.LiteralValue[]) =>
    JSON.stringify([...values].map((value) => `${typeof value}:${String(value)}`).sort());
  return encode(a) === encode(b);
};

/**
 * Whether two property types are close enough to map by name alone.
 *
 * Deliberately conservative: a name match is a hint, not a mapping, and a wrong automatic mapping is
 * worse than an absent one. Enum-like properties must carry the *same* literal set — two `status`
 * fields with different members describe different vocabularies, so they are reported as suspicious
 * rather than silently wired together.
 */
export const compatible = (source: SchemaEx.SchemaProperty, target: SchemaEx.SchemaProperty): boolean => {
  // A required target fed by an optional source would promise a value the source may not have.
  if (source.isOptional && !target.isOptional) {
    return false;
  }

  const sourceLiterals = literals(source.type);
  const targetLiterals = literals(target.type);
  if (sourceLiterals || targetLiterals) {
    return sourceLiterals != null && targetLiterals != null && sameLiterals(sourceLiterals, targetLiterals);
  }

  if (source.type._tag !== target.type._tag) {
    return false;
  }

  // Structs match only when they declare the same property names; nothing here recurses, so a
  // same-shaped struct with differently-typed leaves is a known false positive of the PoC.
  if (SchemaAST.isObjects(source.type) && SchemaAST.isObjects(target.type)) {
    const names = (ast: SchemaAST.Objects) =>
      ast.propertySignatures
        .map((property) => String(property.name))
        .sort()
        .join(',');
    return names(source.type) === names(target.type);
  }

  // Declarations (Ref, and the branded formats) carry their identity in the AST identifier.
  if (SchemaAST.isDeclaration(source.type)) {
    // Two absent identifiers must not compare equal, or unrelated declarations would map to each
    // other; the explicit `undefined` check below is what prevents that.
    const sourceIdentifier = SchemaAST.getIdentifierAnnotation(source.type);
    return sourceIdentifier !== undefined && sourceIdentifier === SchemaAST.getIdentifierAnnotation(target.type);
  }

  return true;
};

const isDerived = (entry: object): entry is Derived => 'from' in entry && 'get' in entry;
const isNested = (entry: object): entry is Nested => 'kind' in entry && (entry as Nested).kind === 'nested';
const isOneWay = (entry: object): entry is OneWay => 'kind' in entry && (entry as OneWay).kind === 'oneWay';
const isConverted = (entry: object): entry is Converted => 'kind' in entry && (entry as Converted).kind === 'converted';
const isReadOnly = (entry: object): entry is { kind: 'readOnly'; property: string } =>
  'kind' in entry && (entry as { kind: string }).kind === 'readOnly';

const resolveCodec = (codec: Codec | string): Codec => (typeof codec === 'string' ? getCodec(codec) : codec);

/** Read the declared source properties into a plain object for a mapping's `get`/`put`. */
export const readSource = (read: (property: string) => unknown, from: readonly string[]): Record<string, unknown> => {
  const source: Record<string, unknown> = {};
  for (const property of from) {
    source[property] = read(property);
  }
  return source;
};

type Properties = ReadonlyMap<string, SchemaEx.SchemaProperty>;

/** Applies `map` where `shape` says, to a value that has that shape; any other value passes through. */
export const mapShape = (
  shape: Shape,
  value: unknown,
  map: (inner: Record<string, unknown>, previous: Record<string, unknown> | undefined) => unknown,
  previous?: unknown,
): unknown => {
  const record = (candidate: unknown): Record<string, unknown> | undefined =>
    typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : undefined;
  switch (shape) {
    case 'struct': {
      const inner = record(value);
      return inner ? map(inner, record(previous)) : value;
    }
    case 'each':
      return Array.isArray(value)
        ? value.map((element, index) => {
            const inner = record(element);
            return inner ? map(inner, Array.isArray(previous) ? record(previous[index]) : undefined) : element;
          })
        : value;
    case 'values': {
      const values = record(value);
      return values
        ? Object.fromEntries(
            Object.entries(values).map(([key, element]) => {
              const inner = record(element);
              return [key, inner ? map(inner, record(record(previous)?.[key])) : element];
            }),
          )
        : value;
    }
  }
};

/** Projects plain source data through a plan; a target-only property reads its default. */
export const projectPlain = (plan: Plan, source: Record<string, unknown>): Record<string, unknown> => {
  const view: Record<string, unknown> = {};
  for (const entry of plan.entries) {
    const value = entry.get(readSource((property) => source[property], entry.from));
    if (value !== undefined) {
      view[entry.property] = value;
    }
  }
  for (const property of plan.overlays) {
    if (property in plan.defaults) {
      view[property] = plan.defaults[property];
    }
  }
  return view;
};

/** Writes a plain view back onto the source data it was projected from, keeping what the view drops. */
const invertPlain = (
  plan: Plan,
  view: Record<string, unknown>,
  previous: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...previous };
  for (const entry of plan.entries) {
    if (entry.put && entry.property in view) {
      Object.assign(
        next,
        entry.put(
          view[entry.property],
          readSource((property) => previous?.[property], entry.from),
        ),
      );
    }
  }
  return next;
};

const entryFor = (
  property: string,
  entry: MappingEntryLike,
  sourceProperties: Properties,
  targetProperties: Properties,
): ResolvedEntry => {
  if (typeof entry === 'object' && isNested(entry)) {
    const from = entry.property;
    const source = sourceProperties.get(from);
    const target = targetProperties.get(property);
    const sourceInner = source && innerAst(source.type, entry.shape);
    const targetInner = target && innerAst(target.type, entry.shape);
    if (!sourceInner || !targetInner) {
      throw new TypeError(
        `Lens: "${property}" and "${from}" do not both hold the ${entry.shape} the mapping describes.`,
      );
    }
    const inner = planOf(
      SchemaEx.getProperties(sourceInner),
      SchemaEx.getProperties(targetInner),
      entry.mapping,
      entry.defaults ?? {},
      new Set(),
    );
    const serialized = serializePlan(inner);
    const codes = inner.entries.flatMap((resolved) => (resolved.code === undefined ? [] : [resolved.code]));
    return {
      property,
      from: [from],
      get: (values) => mapShape(entry.shape, values[from], (value) => projectPlain(inner, value)),
      put: (value, values) => ({
        [from]: mapShape(entry.shape, value, (view, previous) => invertPlain(inner, view, previous), values[from]),
      }),
      origin: 'explicit',
      serialized: serialized && { kind: 'nested', from, shape: entry.shape, inner: serialized },
      code: codes.length > 0 ? codes.join('\n') : undefined,
      nested: { shape: entry.shape, plan: inner },
    };
  }

  if (typeof entry === 'object' && isOneWay(entry)) {
    const { spec } = entry;
    return {
      property,
      from: spec.from,
      get: (source) => evaluate(spec, source),
      origin: 'explicit',
      serialized: { kind: 'oneWay', spec },
      oneWay: spec,
    };
  }

  if (typeof entry === 'string') {
    return {
      property,
      from: [entry],
      get: (source) => source[entry],
      put: (value) => ({ [entry]: value }),
      origin: 'explicit',
      serialized: { kind: 'rename', from: entry },
    };
  }

  if (isConverted(entry)) {
    const from = entry.property;
    return {
      property,
      from: [from],
      get: (source) => {
        const value = source[from];
        return value === undefined ? undefined : resolveCodec(entry.codec).decode(value);
      },
      put: (value) => ({ [from]: value === undefined ? undefined : resolveCodec(entry.codec).encode(value) }),
      origin: 'explicit',
      serialized: typeof entry.codec === 'string' ? { kind: 'converted', from, codec: entry.codec } : undefined,
      code: typeof entry.codec === 'string' ? undefined : `${entry.codec.decode}\n${entry.codec.encode}`,
    };
  }

  if (isReadOnly(entry)) {
    const from = entry.property;
    return {
      property,
      from: [from],
      get: (source) => source[from],
      origin: 'explicit',
      serialized: { kind: 'readOnly', from },
    };
  }

  if (isDerived(entry)) {
    // Captured, not re-read in the closure: the guard proves it exists here, which a later
    // `entry.put` access cannot.
    const put = entry.put;
    return {
      property,
      from: entry.from as readonly string[],
      get: (source) => entry.get(source),
      put: put && ((value, source) => put(value, source) as Record<string, unknown>),
      origin: 'explicit',
      code: `${entry.get}\n${put ?? ''}`,
    };
  }

  throw new TypeError(`Lens: unrecognized mapping entry for "${property}".`);
};

type MappingEntryLike = string | Converted | Derived | Nested | OneWay | { kind: 'readOnly'; property: string };

/**
 * The plan as data, or `undefined` when an entry runs inline code. Same-name matches are written out as
 * renames, so the data runs without the schemas the plan was compiled against.
 */
export const serializePlan = (plan: Plan): SerializedPlan | undefined => {
  const entries: (SerializedEntry & { property: string })[] = [];
  for (const entry of plan.entries) {
    const serialized: SerializedEntry | undefined =
      entry.origin === 'automatic' ? { kind: 'rename', from: entry.property } : entry.serialized;
    if (!serialized) {
      return undefined;
    }
    entries.push({ ...serialized, property: entry.property });
  }
  return { entries, overlays: plan.overlays, dropped: plan.coverage.dropped, defaults: plan.defaults };
};

/**
 * Compile a partial mapping into the plan the reader and writer run, plus the coverage report.
 *
 * Resolution order per target property: explicit entry, else automatic (same name, compatible type),
 * else overlay. A name match with an incompatible type resolves to neither — it is reported as
 * suspicious and left unmapped, because overlaying it would duplicate a fact the source already holds.
 */
export const plan = (
  source: Type.AnyObj,
  target: Type.AnyObj | Schema.Top,
  mapping: Mapping,
  defaults: Readonly<Record<string, unknown>> = {},
): Plan => planOf(properties(source), properties(target), mapping, defaults, RESERVED);

const planOf = (
  sourceList: readonly SchemaEx.SchemaProperty[],
  targetList: readonly SchemaEx.SchemaProperty[],
  mapping: Mapping,
  explicitDefaults: Readonly<Record<string, unknown>>,
  reserved: ReadonlySet<string>,
): Plan => {
  const sourceProperties = new Map(
    sourceList
      .filter((property) => !reserved.has(String(property.name)))
      .map((property) => [String(property.name), property]),
  );
  const targetProperties = new Map(
    targetList
      .filter((property) => !reserved.has(String(property.name)))
      .map((property) => [String(property.name), property]),
  );

  const entries: ResolvedEntry[] = [];
  const explicit: string[] = [];
  const automatic: string[] = [];
  const overlays: string[] = [];
  const suspicious: { property: string; candidates: readonly string[] }[] = [];

  for (const [name, targetProperty] of targetProperties) {
    const declared = (mapping as Record<string, MappingEntryLike | undefined>)[name];

    if (declared !== undefined) {
      const resolved = entryFor(name, declared, sourceProperties, targetProperties);
      for (const read of resolved.from) {
        if (!sourceProperties.has(read)) {
          throw new TypeError(`Lens: mapping for "${name}" reads unknown source property "${read}".`);
        }
      }
      entries.push(resolved);
      explicit.push(name);
      continue;
    }

    const candidate = sourceProperties.get(name);
    if (candidate && compatible(candidate, targetProperty)) {
      entries.push({
        property: name,
        from: [name],
        get: (values) => values[name],
        put: (value) => ({ [name]: value }),
        origin: 'automatic',
      });
      automatic.push(name);
      continue;
    }

    if (candidate) {
      suspicious.push({ property: name, candidates: [name] });
      continue;
    }

    overlays.push(name);
  }

  const read = new Set(entries.flatMap((entry) => entry.from));
  const dropped = [...sourceProperties.keys()].filter((name) => !read.has(name));
  // Read only by a one-way entry, so going back nothing restores them.
  const twoWay = new Set(
    entries.filter((entry) => !entry.oneWay && entry.serialized?.kind !== 'readOnly').flatMap((entry) => entry.from),
  );
  const oneWayOnly = [...read].filter((name) => !twoWay.has(name));

  // Properties only one side declares start at an explicit default, else the schema's.
  const defaults: Record<string, unknown> = {};
  for (const [names, byName] of [
    [overlays, targetProperties],
    [[...dropped, ...oneWayOnly], sourceProperties],
  ] as const) {
    for (const name of names) {
      const type = byName.get(name)?.type;
      const value = name in explicitDefaults ? explicitDefaults[name] : type && SchemaAST.getDefaultAnnotation(type);
      if (value !== undefined) {
        defaults[name] = value;
      }
    }
  }
  const requiredOf = (byName: Properties) =>
    [...byName.values()].filter((property) => !property.isOptional).map((property) => String(property.name));

  return {
    entries,
    overlays,
    coverage: { explicit, automatic, overlaid: overlays, dropped, suspicious },
    defaults,
    required: { source: requiredOf(sourceProperties), target: requiredOf(targetProperties) },
  };
};
