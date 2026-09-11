//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN, type EntityId } from '@dxos/keys';

import type * as Type from '../../Type.ts';
import { type TypeAnnotation, TypeAnnotationId } from '../Annotation/annotations.ts';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util.ts';
import { EntityKind } from '../common/types/index.ts';
import { toJsonSchema } from '../JsonSchema/index.ts';
import { type EchoTypeOptions, type EchoTypeSchema, makeEchoTypeSchema } from './entity.ts';

/**
 * Object schema type with kind marker.
 */
export type EchoObjectSchema<
  Self extends Schema.Top,
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
  ): <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ) => EchoObjectSchema<Self, Fields>;
} = (dxn, options) => {
  const typename = DXN.getName(dxn);
  const version = DXN.getVersion(dxn);
  invariant(version, `Type.makeObject requires a versioned DXN: ${dxn}`);

  return <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ): EchoObjectSchema<Self, Fields> => {
    // Annotation ids are string keys in Effect 4; this guards against a bundling mishap that
    // leaves the id undefined, which would silently drop the annotation.
    invariant(typeof TypeAnnotationId === 'string', 'Sanity.');
    invariant(SchemaAST.isObjects(self.ast), 'Schema must be a TypeLiteral.');

    // Struct schemas expose `.fields`; retained for the schema's public field map.
    const fields = ((self as any).fields ?? {}) as Fields;

    // The id is prepended to the existing object node rather than rebuilt from `.fields`:
    // rebuilding drops index signatures, which is how `Expando` and other record-shaped types are
    // declared. (`mapFields` is unavailable here -- it is a `Struct` method and `self` is generic.)
    const schemaWithId = new SchemaAST.Objects(
      self.ast.propertySignatures.some((property) => property.name === 'id')
        ? self.ast.propertySignatures
        : [...self.ast.propertySignatures, new SchemaAST.PropertySignature('id', Schema.String.ast)],
      self.ast.indexSignatures,
    );
    const ast = SchemaAST.annotate(schemaWithId, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?
      ...makeTypeJsonSchemaAnnotation({
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

export const makeObjectType = <Self, _Schema extends Schema.Top>(
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
