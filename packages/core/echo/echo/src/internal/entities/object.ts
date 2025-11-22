//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';

import { EntityKind, type TypeAnnotation, TypeAnnotationId, type TypeMeta } from '../ast';
import { makeTypeJsonSchemaAnnotation } from '../json-schema';

import { type EchoTypeSchema, makeEchoTypeSchema } from './entity';

/**
 * Pipeable function to add ECHO object annotations to a schema.
 */
// TODO(dmaretskyi): Rename EchoObjectSchema (use import namespace).
export const EchoObject: {
  // TODO(burdon): Tighten Self type to Schema.TypeLiteral or Schema.Struct to facilitate definition of `make` method.
  // (meta: TypeMeta): <Self extends Schema.Struct<Fields>, Fields extends Schema.Struct.Fields>(self: Self) => EchoObjectSchema<Self, Fields>;
  (meta: TypeMeta): <Self extends Schema.Schema.Any>(self: Self) => EchoTypeSchema<Self>;
} = ({ typename, version }) => {
  return <Self extends Schema.Schema.Any>(self: Self): EchoTypeSchema<Self> => {
    invariant(typeof TypeAnnotationId === 'symbol', 'Sanity.');
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = Schema.extend(Schema.mutable(self), Schema.Struct({ id: Schema.String }));
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

    return makeEchoTypeSchema<Self>(/* self.fields, */ ast, typename, version);
  };
};
