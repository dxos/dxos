//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { IdentifierAnnotationId } from '@effect/schema/AST';

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
  /**
   * Globally unique DXNS name for the object.
   * Used by the registry to resolve the object.
   */
  name: S.optional(S.String),

  /**
   * Semver version of the object.
   * Used by the registry to resolve the object.
   */
  version: S.optional(S.String),

  /**
   * Space ID of the object.
   * Used by the registry to track the space the object belongs to.
   */
  space: S.optional(S.String),
}).pipe(S.mutable);

export type ObjectMeta = S.Schema.Type<typeof ObjectMetaSchema>;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;
