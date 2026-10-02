//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';

import * as Type from '../../Type.ts';
import { type Plan, type ResolvedEntry } from './types.ts';

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

/** A plan described by what it does, its entries in a fixed order. */
const describePlan = (plan: Plan) => ({
  entries: plan.entries.map(describe).sort((left, right) => (canonical(left) < canonical(right) ? -1 : 1)),
  overlays: [...plan.overlays].sort(),
  defaults: plan.defaults,
});

/**
 * An entry described by what it does: a same-name match and an explicit same-name rename are one entry. An entry
 * that cannot be serialized is described by its code and, for a nested or linked entry, by its inner plan.
 */
const describe = (entry: ResolvedEntry): unknown =>
  entry.origin === 'automatic'
    ? { property: entry.property, kind: 'rename', from: entry.property }
    : entry.serialized
      ? { property: entry.property, ...entry.serialized }
      : {
          property: entry.property,
          kind: 'code',
          from: entry.from,
          code: entry.code,
          nested: entry.nested && { shape: entry.nested.shape, plan: describePlan(entry.nested.plan) },
          link: entry.link && {
            shape: entry.link.shape,
            child: Type.getURI(entry.link.child),
            plan: describePlan(entry.link.plan),
          },
        };

/**
 * The digest of a declarative lens: its endpoints, every resolved entry (nested plans included) and the
 * defaults it starts at, as canonical JSON. Whatever records it hashes it to the length it needs.
 */
export const planDigest = (source: Type.AnyObj, target: Type.AnyObj | Schema.Top, plan: Plan): string =>
  canonical({ source: Type.getURI(source), target: endpointOf(target), ...describePlan(plan) });
