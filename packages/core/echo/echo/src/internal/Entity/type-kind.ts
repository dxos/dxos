//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { type TypeAnnotation, TypeAnnotationId, makeTypeJsonSchemaAnnotation } from '../Annotation';
import { EntityKind } from '../common/types';
import { toJsonSchema } from '../JsonSchema';
import { type EchoTypeSchema, makeEchoTypeSchema } from './entity';

/**
 * Type-kind schema marker — produced by {@link EchoTypeKindSchema}.
 *
 * Distinguishes meta-schemas (entities of `EntityKind.Type`, such as the
 * built-in `Type.Type` TypeSchema) from object and relation types.
 */
export type EchoTypeKindSchema<
  Self extends Schema.Schema.Any,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> = EchoTypeSchema<Self, {}, EntityKind.Type, Fields>;

/**
 * Pipeable that brands a schema as a type-kind ECHO entity. Mirrors
 * {@link EchoObjectSchema} / {@link EchoRelationSchema}, but stamps the
 * resulting entity with `[SchemaKindId]: EntityKind.Type` and a matching
 * `TypeAnnotation.kind = 'type'` so meta-schemas surface uniformly through
 * `Type.isTypeKindSchema`, `Filter.type`, etc.
 */
export const EchoTypeKindSchema: {
  (
    dxn: DXN.DXN,
  ): <Self extends Schema.Schema.Any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ) => EchoTypeKindSchema<Self, Fields>;
} = (dxn) => {
  const typename = DXN.getName(dxn);
  const version = DXN.getVersion(dxn);
  invariant(version, `Type-kind schemas require a versioned DXN: ${dxn}`);

  return <Self extends Schema.Schema.Any, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ): EchoTypeKindSchema<Self, Fields> => {
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    const fields = ((self as any).fields ?? {}) as Fields;

    const schemaWithId = Schema.extend(self, Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Type, typename, version } satisfies TypeAnnotation,
      [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Type,
        typename,
        version,
      }),
    });

    return makeEchoTypeSchema<Self, EntityKind.Type, Fields>(fields, ast, typename, version, EntityKind.Type, () =>
      toJsonSchema(Schema.make(ast)),
    );
  };
};
