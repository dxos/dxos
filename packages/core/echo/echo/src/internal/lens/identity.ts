//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { SchemaAST, SchemaEx } from '@dxos/effect';

import * as Type from '../../Type.ts';
import { type Plan } from './types.ts';

//
// A lens is named by the two types it connects and identified, separately, by a digest of what it does.
// The name keys registration and overlays; the digest is what version documents record, so it must
// change whenever the translation would.
//

/** The name of a lens's target: its type URI, or a plain schema's identifier annotation. */
export const endpointOf = (entity: Type.AnyObj | Schema.Top): string => {
  if (Type.isType(entity)) {
    return Type.getURI(entity);
  }
  const identifier = SchemaAST.getIdentifierAnnotation(entity.ast);
  if (typeof identifier !== 'string') {
    throw new TypeError('Lens: a plain-schema target needs an identifier annotation to name the lens.');
  }
  return identifier;
};

/** A lens's name, from its endpoints. */
export const nameOf = (source: Type.AnyObj, target: Type.AnyObj | Schema.Top): string =>
  `${Type.getURI(source)} -> ${endpointOf(target)}`;

/** JSON with object keys sorted, so equal values always encode to equal text. */
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner !== null && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
      : inner,
  );

const propertiesOf = (entity: Type.AnyObj | Schema.Top): SchemaEx.SchemaProperty[] =>
  SchemaEx.getProperties((Type.isType(entity) ? Type.getSchema(entity) : entity).ast);

/**
 * The value each property only one side declares starts at: an explicit default, else the schema's.
 * Target-only properties are read from the target schema, source-only (dropped) ones from the source.
 */
export const resolveDefaults = (
  source: Type.AnyObj,
  target: Type.AnyObj | Schema.Top,
  plan: Plan,
  defaults: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
  const schemaDefaults = (entity: Type.AnyObj | Schema.Top, names: readonly string[]) => {
    const byName = new Map(propertiesOf(entity).map((property) => [String(property.name), property]));
    return names.flatMap((name) => {
      const type = byName.get(name)?.type;
      const value = name in defaults ? defaults[name] : type && SchemaAST.getDefaultAnnotation(type);
      return value === undefined ? [] : [[name, value] as const];
    });
  };
  return Object.fromEntries([
    ...schemaDefaults(target, plan.overlays),
    ...schemaDefaults(source, plan.coverage.dropped),
  ]);
};

/**
 * The digest of a declarative lens: its endpoints, every resolved entry and the defaults it starts at, as
 * canonical JSON. Whatever records it hashes it to the length it needs.
 */
export const planDigest = (
  source: Type.AnyObj,
  target: Type.AnyObj | Schema.Top,
  plan: Plan,
  defaults: Readonly<Record<string, unknown>>,
): string =>
  canonical({
    source: Type.getURI(source),
    target: endpointOf(target),
    entries: plan.entries
      .map(({ property, from, origin, serialized, code }) => ({ property, from, origin, serialized, code }))
      .sort((left, right) => (left.property < right.property ? -1 : 1)),
    overlays: [...plan.overlays].sort(),
    defaults: resolveDefaults(source, target, plan, defaults),
  });
