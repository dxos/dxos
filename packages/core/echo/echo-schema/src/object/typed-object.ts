//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { invariant } from '@dxos/invariant';

import { makeTypedEntityClass, type TypedObjectFields, type TypedObjectOptions } from './common';
import { type TypeAnnotation, TypeAnnotationId, type TypeMeta, Typename, Version } from '../ast';
import { EntityKind, type HasId } from '../types';

/**
 * Definition for an object type that can be stored in an ECHO database.
 * Implements effect schema to define object properties.
 * Has a typename and version.
 *
 * In contrast to {@link EchoSchema} this definition is not recorded in the database.
 */
export interface TypedObject<A = any, I = any> extends TypeMeta, Schema.Schema<A, I> {}

/**
 * Typed object that could be used as a prototype in class definitions.
 * This is an internal API type.
 * Use {@link TypedObject} for the common use-cases.
 */
export interface TypedObjectPrototype<A = any, I = any> extends TypedObject<A, I> {
  /** Type constructor. */
  new (): HasId & A;
}

export type TypedObjectProps = TypeMeta & {
  // TODO(dmaretskyi): Remove after all legacy types has been removed.
  disableValidation?: boolean;
};

/**
 * Base class factory for typed objects.
 * @deprecated Use pipe(Type.def) instead.
 */
export const TypedObject = ({ typename: _typename, version: _version, disableValidation }: TypedObjectProps) => {
  const typename = Typename.make(_typename, { disableValidation });
  const version = Version.make(_version, { disableValidation });

  /**
   * Return class definition factory.
   */
  return <SchemaFields extends Schema.Struct.Fields, Options extends TypedObjectOptions>(
    fields: SchemaFields,
    options?: Options,
  ): TypedObjectPrototype<TypedObjectFields<SchemaFields, Options>, Schema.Struct.Encoded<SchemaFields>> => {
    // Create schema from fields.
    const schema: Schema.Schema.All = options?.record
      ? Schema.Struct(fields, { key: Schema.String, value: Schema.Any })
      : Schema.Struct(fields);

    // Set ECHO object id property.
    const typeSchema = Schema.extend(
      Schema.mutable(options?.partial ? Schema.partial(schema) : schema),
      Schema.Struct({ id: Schema.String }),
    );

    // Set ECHO annotations.
    invariant(typeof EntityKind.Object === 'string');
    const annotatedSchema = typeSchema.annotations({
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
    });

    /**
     * Return class definition.
     * NOTE: Actual reactive ECHO objects must be created via the `live(Type)` function.
     */
    // TODO(burdon): This is missing fields required by TypedObject (e.g., Type, Encoded, Context)?
    return class TypedObject extends makeTypedEntityClass(typename, version, annotatedSchema as any) {} as any;
  };
};
