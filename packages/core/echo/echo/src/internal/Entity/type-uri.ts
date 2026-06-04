//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { assertArgument } from '@dxos/invariant';
import { DXN, URI } from '@dxos/keys';

import { getSchemaURI, getTypename } from '../Annotation/annotations';
import { type AnyEntity, InstancePhantomId, KindId, TypeId, getStaticTypeSchema } from '../common/types';
import { getUri as getUriFromEntity } from './api';

/**
 * @param input schema, `Type.Type` entity, or a typename string.
 * @return type identifier URI — see {@link getSchemaURI}. For a typename string,
 * always a DXN. For a `Type.Type` entity, the URI of the schema it declares,
 * symmetric with what `Obj.make(typeEntity, ...)` stamps on `system.type`: a
 * static declaration resolves to its typename DXN, a persisted entity to its
 * local `echo:/<objectId>`.
 */
export const getTypeURIFromSpecifier = (input: Schema.Schema.All | AnyEntity | string): URI.URI => {
  if (Schema.isSchema(input)) {
    return getSchemaURI(input) ?? raise(new TypeError('Schema has no URI'));
  }
  if (typeof input === 'object' && input !== null && KindId in input) {
    // `Type.Type` entity. Both in-memory and persisted forms expose the schema
    // they declare via `StaticTypeSchemaSlot`, whose URI is exactly what
    // `Obj.make` stamps on `system.type` — a static declaration carries
    // `TypeAnnotation` (→ typename DXN), a persisted entity's rebuilt schema
    // carries `TypeIdentifierAnnotation` (→ local `echo:/<objectId>`).
    const schema = getStaticTypeSchema(input);
    if (schema != null) {
      return getSchemaURI(schema) ?? raise(new TypeError('Type entity has no URI'));
    }
    return getUriFromEntity(input as AnyEntity);
  }
  assertArgument(typeof input === 'string', 'input');
  assertArgument(!input.startsWith('dxn:'), 'input');
  return DXN.make(input);
};

/**
 * Checks if the object is an instance of the schema.
 * Only typename is compared, the schema version is ignored.
 *
 * The following cases are considered to mean that the object is an instance of the schema:
 *  - Object was created with this exact schema.
 *  - Object was created with a different version of this schema.
 *  - Object was created with a different schema (maybe dynamic) that has the same typename.
 */
// TODO(burdon): Can we use `Schema.is`?
export const isInstanceOf = <S>(
  schemaOrType: S extends Schema.Schema.AnyNoContext ? S : Schema.Schema.AnyNoContext | AnyEntity,
  object: any,
): object is S extends Schema.Schema.AnyNoContext
  ? Schema.Schema.Type<S>
  : S extends { readonly [InstancePhantomId]?: infer A }
    ? A
    : unknown => {
  if (object == null) {
    return false;
  }

  const schemaURI = getTypeURIFromSpecifier(schemaOrType);

  // `object` is arbitrary input — read TypeId directly (it may be missing on
  // non-entities) rather than via `getTypeURI` which asserts the URI is set.
  const type = (object as any)[TypeId];
  if (URI.isURI(type) && type === schemaURI) {
    return true;
  }

  const typename = getTypename(object);
  if (!typename) {
    return false;
  }

  if (!DXN.isDXN(schemaURI)) {
    // EID-based schema URI — no typename match possible.
    return false;
  }

  const parsed = DXN.tryMake(schemaURI);
  return parsed != null && DXN.getName(parsed) === typename;
};
