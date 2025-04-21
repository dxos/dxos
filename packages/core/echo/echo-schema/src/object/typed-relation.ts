//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { invariant } from '@dxos/invariant';

import { makeTypedEntityClass, type TypedObjectFields, type TypedObjectOptions } from './common';
import type { RelationSourceTargetRefs } from './relation';
import { EntityKind, type HasId, TypeAnnotationId, Typename, Version } from '../ast';
import type { TypeAnnotation, TypeMeta } from '../ast/annotations';

/**
 * Definition for an object type that can be stored in an ECHO database.
 * Implements effect schema to define object properties.
 * Has a typename and version.
 *
 * In contrast to {@link EchoSchema} this definition is not recorded in the database.
 */
export interface TypedRelation<A = any, I = any> extends TypeMeta, S.Schema<A, I> {}

/**
 * Typed object that could be used as a prototype in class definitions.
 * This is an internal API type.
 * Use {@link TypedRelation} for the common use-cases.
 */
export interface TypedRelationPrototype<A = any, I = any> extends TypedRelation<A, I> {
  /** Type constructor. */
  new (): HasId & A;
}

export type TypedRelationProps = TypeMeta & {
  // TODO(dmaretskyi): Remove after all legacy types has been removed.
  disableValidation?: boolean;
};

/**
 * Base class factory for typed objects.
 */
export const TypedRelation = ({ typename: _typename, version: _version, disableValidation }: TypedRelationProps) => {
  const typename = Typename.make(_typename, { disableValidation });
  const version = Version.make(_version, { disableValidation });

  /**
   * Return class definition factory.
   */
  return <SchemaFields extends S.Struct.Fields, Options extends TypedObjectOptions>(
    fields: SchemaFields,
    options?: Options,
  ): TypedRelationPrototype<
    TypedObjectFields<SchemaFields, Options> & RelationSourceTargetRefs,
    S.Struct.Encoded<SchemaFields>
  > => {
    // Create schema from fields.
    const schema: S.Schema.All = options?.record ? S.Struct(fields, { key: S.String, value: S.Any }) : S.Struct(fields);

    // Set ECHO object id property.
    const typeSchema = S.extend(S.mutable(options?.partial ? S.partial(schema) : schema), S.Struct({ id: S.String }));

    // Set ECHO annotations.
    invariant(typeof EntityKind.Relation === 'string');
    const annotatedSchema = typeSchema.annotations({
      [TypeAnnotationId]: { kind: EntityKind.Relation, typename, version } satisfies TypeAnnotation,
    });

    /**
     * Return class definition.
     * NOTE: Actual reactive ECHO objects must be created via the `create(Type)` function.
     */
    // TODO(burdon): This is missing fields required by TypedRelation (e.g., Type, Encoded, Context)?
    return class TypedRelation extends makeTypedEntityClass(typename, version, annotatedSchema as any) {} as any;
  };
};
