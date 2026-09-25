//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { type TypeAnnotation, TypeAnnotationId } from '../Annotation/annotations.ts';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util.ts';
import { EntityKind } from '../common/types/index.ts';
import { toJsonSchema } from '../JsonSchema/index.ts';
import { type EchoTypeOptions, type EchoTypeSchema, makeEchoTypeSchema } from './entity.ts';

/**
 * Type-kind schema marker — produced by {@link EchoTypeKindSchema}.
 *
 * Distinguishes meta-schemas (entities of `EntityKind.Type`, such as the
 * built-in `Type.Type` TypeSchema) from object and relation types.
 */
export type EchoTypeKindSchema<
  Self extends Schema.Top,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> = EchoTypeSchema<Self, {}, EntityKind.Type, Fields>;

/**
 * Pipeable that brands a schema as a type-kind ECHO entity. Mirrors
 * {@link EchoObjectSchema} / {@link EchoRelationSchema}, but stamps the
 * resulting entity with `[SchemaKindId]: EntityKind.Type` and a matching
 * `TypeAnnotation.kind = 'type'` so meta-schemas surface uniformly through
 * `Type.isTypeKind`, `Filter.type`, etc.
 */
export const EchoTypeKindSchema: {
  (
    dxn: DXN.DXN,
    options?: EchoTypeOptions,
  ): <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ) => EchoTypeKindSchema<Self, Fields>;
} = (dxn, options) => {
  const typename = DXN.getName(dxn);
  const version = DXN.getVersion(dxn);
  invariant(version, `Type-kind schemas require a versioned DXN: ${dxn}`);

  return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ): EchoTypeKindSchema<Self, Fields> => {
    invariant(SchemaAST.isObjects(self.ast), 'Schema must be a TypeLiteral.');

    const fields = ((self as any).fields ?? {}) as Fields;

    // The id is prepended to the existing object node rather than rebuilt from `.fields`:
    // rebuilding drops index signatures, which is how record-shaped types are declared.
    const schemaWithId = new SchemaAST.Objects(
      self.ast.propertySignatures.some((property) => property.name === 'id')
        ? self.ast.propertySignatures
        : [...self.ast.propertySignatures, new SchemaAST.PropertySignature('id', Schema.String.ast)],
      self.ast.indexSignatures,
    );
    const ast = SchemaAST.annotate(schemaWithId, {
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Type, typename, version } satisfies TypeAnnotation,
      ...makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Type,
        typename,
        version,
      }),
    });

    return makeEchoTypeSchema<Self, EntityKind.Type, Fields>(
      fields,
      ast,
      typename,
      version,
      EntityKind.Type,
      () => toJsonSchema(Schema.make(ast)),
      options?.id,
    );
  };
};
