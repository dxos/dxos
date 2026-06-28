//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';
import { type EntityId, DXN } from '@dxos/keys';

import type * as Type from '../../Type';
import { type TypeAnnotation, TypeAnnotationId } from '../Annotation/annotations';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util';
import { EntityKind } from '../common/types';
import { toJsonSchema } from '../JsonSchema';
import { type EchoTypeOptions, type EchoTypeSchema, makeEchoTypeSchema } from './entity';

/**
 * Object schema type with kind marker.
 */
export type EchoObjectSchema<
  Self extends Schema.Schema.Any,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> = EchoTypeSchema<Self, {}, EntityKind.Object, Fields>;

/**
 * Schema for Obj entity types.
 * Pipeable function to add ECHO object annotations to a schema.
 */
export const EchoObjectSchema: {
  (
    dxn: DXN.DXN,
    options?: EchoTypeOptions,
  ): <Self extends Schema.Schema.Any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ) => EchoObjectSchema<Self, Fields>;
} = (dxn, options) => {
  const typename = DXN.getName(dxn);
  const version = DXN.getVersion(dxn);
  invariant(version, `Type.makeObject requires a versioned DXN: ${dxn}`);

  return <Self extends Schema.Schema.Any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ): EchoObjectSchema<Self, Fields> => {
    invariant(typeof TypeAnnotationId === 'symbol', 'Sanity.');
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // Extract fields from the schema if available (Struct schemas have .fields).
    const fields = ((self as any).fields ?? {}) as Fields;

    const schemaWithId = Schema.extend(self, Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?
      [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Object,
        typename,
        version,
      }),
    });

    return makeEchoTypeSchema<Self, EntityKind.Object, Fields>(
      fields,
      ast,
      typename,
      version,
      EntityKind.Object,
      () => toJsonSchema(Schema.make(ast)),
      options?.id,
    );
  };
};

export const makeObjectType = <Self, _Schema extends Schema.Schema.Any>(
  dxn: DXN.DXN,
  schema: _Schema,
  options?: { id?: EntityId },
): Type.ObjClass<Self, Schema.Schema.Type<_Schema>, {}> => {
  const type = EchoObjectSchema(dxn, options)(schema);
  const constructor = function ObjectType() {};
  Object.setPrototypeOf(constructor, type);
  // Boundary cast: constructor/prototype wiring cannot be expressed in TypeScript's type system.
  return constructor as unknown as Type.ObjClass<Self, Schema.Schema.Type<_Schema>, {}>;
};
