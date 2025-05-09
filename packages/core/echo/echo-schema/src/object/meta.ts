//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { IdentifierAnnotationId } from 'effect/SchemaAST';
import { invariant } from '@dxos/invariant';

//
// ForeignKey
//

const _ForeignKeySchema = S.Struct({
  source: S.String,
  // TODO(wittjosiah): This annotation is currently used to ensure id field shows up in forms.
  id: S.String.annotations({ [IdentifierAnnotationId]: false }),
});

export type ForeignKey = S.Schema.Type<typeof _ForeignKeySchema>;

export const ForeignKeySchema: S.Schema<ForeignKey> = _ForeignKeySchema;

//
// ObjectMeta
//

export const ObjectMetaSchema = S.Struct({
  keys: S.mutable(S.Array(ForeignKeySchema)),
});

export type ObjectMeta = S.Schema.Type<typeof ObjectMetaSchema>;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

/**
 * Symbol to access meta on an object.
 * Must return {@link ObjectMeta} for this object.
 * Only callable on the object root.
 */
export const symbolMeta = Symbol.for('@dxos/schema/ObjectMeta');

/**
 * Get metadata from object.
 * Only callable on the object root.
 */
// TODO(dmaretskyi): Combine with `getMeta`
export const getObjectMeta = (object: any): ObjectMeta => {
  const metadata = object[symbolMeta];
  invariant(metadata, 'ObjectMeta not found.');
  return metadata;
};
