//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { invariant } from '@dxos/invariant';

import { makeTypedEntityClass, type TypedObjectFields, type TypedObjectOptions } from './common';
import type { RelationSourceTargetRefs } from './relation';
import { EntityKind, type HasId, ObjectAnnotationId, TYPENAME_REGEX, VERSION_REGEX } from '../ast';
import type { ObjectAnnotation } from '../ast/annotations';

/**
 * Definition for an object type that can be stored in an ECHO database.
 * Implements effect schema to define object properties.
 * Has a typename and version.
 *
 * In contrast to {@link EchoSchema} this definition is not recorded in the database.
 */
export interface TypedRelation<A = any, I = any> extends S.Schema<A, I> {
  /** Fully qualified type name. */
  readonly typename: string;

  /**
   * Semver schema version.
   */
  readonly version: string;
}

/**
 * Typed object that could be used as a prototype in class definitions.
 * This is an internal API type.
 * Use {@link TypedRelation} for the common use-cases.
 */
export interface TypedRelationPrototype<A = any, I = any> extends TypedRelation<A, I> {
  /** Type constructor. */
  new (): HasId & A;
}

export type TypedRelationProps = {
  typename: string;
  version: string;

  // TODO(dmaretskyi): Remove after all legacy types has been removed. (burdon): Can do this now (after 0.7).
  skipTypenameFormatCheck?: boolean;
};

/**
 * Base class factory for typed objects.
 */
// TODO(burdon): Can this be flattened into a single function (e.g., `class X extends TypedRelation({})`).
// TODO(burdon): Support pipe(S.default({}))
export const TypedRelation = ({ typename, version, skipTypenameFormatCheck }: TypedRelationProps) => {
  if (!skipTypenameFormatCheck) {
    if (!TYPENAME_REGEX.test(typename)) {
      throw new TypeError(`Invalid typename: ${typename}`);
    }
    if (!VERSION_REGEX.test(version)) {
      throw new TypeError(`Invalid version: ${version}`);
    }
  }

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
      [ObjectAnnotationId]: { kind: EntityKind.Relation, typename, version } satisfies ObjectAnnotation,
    });

    /**
     * Return class definition.
     * NOTE: Actual reactive ECHO objects must be created via the `create(Type)` function.
     */
    // TODO(burdon): This is missing fields required by TypedRelation (e.g., Type, Encoded, Context)?
    return class TypedRelation extends makeTypedEntityClass(typename, version, annotatedSchema as any) {} as any;
  };
};
