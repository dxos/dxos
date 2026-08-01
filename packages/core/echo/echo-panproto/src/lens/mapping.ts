//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';

import { getCodec } from './codecs';
import { type Codec, type Converted, type Derived, type Mapping, type Plan, type ResolvedEntry } from './types';

/** `id` is identity, never lensed, so it never participates in a mapping. */
const RESERVED = new Set(['id']);

const properties = (entity: Type.AnyObj | Schema.Schema.Any): SchemaEx.SchemaProperty[] => {
  const schema = Type.isType(entity) ? Type.getSchema(entity) : entity;
  return SchemaEx.getProperties(schema.ast).filter((property) => !RESERVED.has(String(property.name)));
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
  if (SchemaAST.isTypeLiteral(source.type) && SchemaAST.isTypeLiteral(target.type)) {
    const names = (ast: SchemaAST.TypeLiteral) =>
      ast.propertySignatures
        .map((property) => String(property.name))
        .sort()
        .join(',');
    return names(source.type) === names(target.type);
  }

  // Declarations (Ref, and the branded formats) carry their identity in the AST identifier.
  if (SchemaAST.isDeclaration(source.type)) {
    // `getIdentifierAnnotation` returns an Option, and comparing the Options' string forms makes two
    // MISSING identifiers compare equal — which would map unrelated declarations to each other.
    const identifier = (ast: SchemaAST.AST) => Option.getOrUndefined(SchemaAST.getIdentifierAnnotation(ast));
    const sourceIdentifier = identifier(source.type);
    return sourceIdentifier !== undefined && sourceIdentifier === identifier(target.type);
  }

  return true;
};

const isDerived = (entry: object): entry is Derived => 'from' in entry && 'get' in entry;
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

const entryFor = (property: string, entry: MappingEntryLike): ResolvedEntry => {
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
    };
  }

  throw new TypeError(`Lens: unrecognized mapping entry for "${property}".`);
};

type MappingEntryLike = string | Converted | Derived | { kind: 'readOnly'; property: string };

/**
 * Compile a partial mapping into the plan the reader and writer run, plus the coverage report.
 *
 * Resolution order per target property: explicit entry, else automatic (same name, compatible type),
 * else overlay. A name match with an incompatible type resolves to neither — it is reported as
 * suspicious and left unmapped, because overlaying it would duplicate a fact the source already holds.
 */
export const plan = (source: Type.AnyObj, target: Type.AnyObj | Schema.Schema.Any, mapping: Mapping): Plan => {
  const sourceProperties = new Map(properties(source).map((property) => [property.name as string, property]));
  const targetProperties = properties(target);

  const entries: ResolvedEntry[] = [];
  const explicit: string[] = [];
  const automatic: string[] = [];
  const overlays: string[] = [];
  const suspicious: { property: string; candidates: readonly string[] }[] = [];

  for (const targetProperty of targetProperties) {
    const name = targetProperty.name as string;
    const declared = (mapping as Record<string, MappingEntryLike | undefined>)[name];

    if (declared !== undefined) {
      const resolved = entryFor(name, declared);
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

  return {
    entries,
    overlays,
    coverage: { explicit, automatic, overlaid: overlays, dropped, suspicious },
  };
};
