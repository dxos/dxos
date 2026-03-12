//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';

import { type TypeAnnotation, TypeAnnotationId, type TypeMeta, makeTypeJsonSchemaAnnotation } from '../annotations';
import { EntityKind } from '../types';

import { type EchoTypeSchema, makeEchoTypeSchema } from './entity';

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
    meta: TypeMeta,
  ): <Self extends Schema.Schema.Any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ) => EchoObjectSchema<Self, Fields>;
} = ({ typename, version }) => {
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

    return makeEchoTypeSchema<Self, EntityKind.Object, Fields>(fields, ast, typename, version, EntityKind.Object);
  };
};
