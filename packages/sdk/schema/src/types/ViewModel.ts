//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';

import { type Database, Entity, Filter, Format, Obj, Query, Ref, type Registry, Scope, Type, View } from '@dxos/echo';
import {
  type JsonSchemaType,
  LabelAnnotation,
  type Mutable,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  TypeEnum,
  toEffectSchema,
} from '@dxos/echo/internal';
import {
  type JsonPath,
  type JsonProp,
  findAnnotation,
  getAnnotation,
  getProperties,
  isArrayType,
  isNestedType,
  runAndForwardErrors,
} from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { ProjectionModel, createEchoChangeCallback } from '../projection';
import { createDefaultSchema, getSchema } from '../util';

type MakeProps = {
  name?: string;
  query: Query.Any;
  queryRaw?: string;
  // TODO(wittjosiah): Revisit this and try to unify this. Maybe always expect Type.AnyEntity since it can be created from JsonSchema anyways.
  jsonSchema: JsonSchemaType; // Base schema.
  /** Persisted `Type.Type` entity backing `jsonSchema`, when one exists; enables `Type.update` on schema edits. */
  type?: Type.AnyEntity;
  overrideSchema?: JsonSchemaType; // Override schema.
  fields?: string[];
  pivotFieldName?: string;
};

/**
 * Create view from provided schema.
 */
export const make = ({
  query,
  queryRaw,
  jsonSchema,
  type,
  overrideSchema,
  fields,
  pivotFieldName,
}: MakeProps): View.View => {
  const view = Obj.make(View.View, {
    query: { raw: queryRaw, ast: query.ast },
    projection: {
      schema: overrideSchema,
      fields: [],
    },
  });

  const projection = new ProjectionModel({
    view,
    baseSchema: jsonSchema,
    change: createEchoChangeCallback(view, type),
  });
  projection.normalizeView();
  const effectSchema = toEffectSchema(jsonSchema);
  const properties = getProperties(effectSchema.ast);
  for (const property of properties) {
    const name = property.name.toString() as JsonProp;
    const include = fields ? fields.includes(name) : name !== 'id';
    if (!include) {
      continue;
    }

    const format = Format.FormatAnnotation.getFromAst(property.type);
    // Omit objects from initial projection as they are difficult to handle automatically.
    if ((isNestedType(property.type) && Option.isNone(format)) || isArrayType(property.type)) {
      continue;
    }

    projection.showFieldProjection(name);
  }

  // Sort fields to match the order in the params.
  if (fields) {
    Obj.update(view, (view) => {
      (view.projection.fields as Mutable<View.Projection>['fields']).sort((a, b) => {
        const indexA = fields.indexOf(a.path);
        const indexB = fields.indexOf(b.path);
        return indexA - indexB;
      });
    });
  }

  if (pivotFieldName) {
    const fieldId = projection.getFieldId(pivotFieldName);
    if (fieldId) {
      Obj.update(view, (view) => {
        view.projection.pivotFieldId = fieldId;
      });
    }
  }

  return view;
};

export type MakeWithReferencesProps = MakeProps & {
  registry?: Registry.Registry;
};

/**
 * Create view from provided schema with references for fields that are references.
 * Referenced schemas are resolved in the provided registries.
 */
export const makeWithReferences = async ({
  query,
  queryRaw,
  jsonSchema,
  type,
  overrideSchema,
  fields,
  pivotFieldName,
  registry,
}: MakeWithReferencesProps): Promise<View.View> => {
  const view = make({
    query,
    queryRaw,
    jsonSchema,
    type,
    overrideSchema,
    fields,
    pivotFieldName,
  });

  const projection = new ProjectionModel({
    view,
    baseSchema: jsonSchema,
    change: createEchoChangeCallback(view, type),
  });
  const effectSchema = toEffectSchema(jsonSchema);
  const properties = getProperties(effectSchema.ast);
  for (const property of properties) {
    const name = property.name.toString() as JsonProp;
    const include = fields ? fields.includes(name) : name !== 'id';
    if (!include) {
      continue;
    }

    if (!Ref.isRefType(property.type)) {
      continue;
    }

    projection.showFieldProjection(name);

    await Effect.gen(function* () {
      const referenceDXN = yield* Function.pipe(
        findAnnotation<ReferenceAnnotationValue>(property.type, ReferenceAnnotationId),
        Option.fromNullable,
        Option.map((ref) => DXN.make(ref.typename, ref.version)),
      );

      const referenceSchema = yield* Effect.tryPromise(() => getSchema(referenceDXN, registry));

      const referencePath = yield* Function.pipe(
        Option.fromNullable(referenceSchema),
        Option.map((schema) => Type.getSchema(schema)),
        Option.flatMap((schema) => LabelAnnotation.get(schema)),
        Option.flatMap((labels) => (labels.length > 0 ? Option.some(labels[0]) : Option.none())),
      );

      if (referenceSchema && referencePath) {
        const fieldId = yield* Option.fromNullable(view.projection.fields?.find((f) => f.path === property.name)?.id);
        const title = getAnnotation<string>(SchemaAST.TitleAnnotationId)(property.type) ?? String.capitalize(name);
        projection.setFieldProjection({
          field: {
            id: fieldId,
            path: property.name as JsonPath,
            referencePath: referencePath as JsonPath,
          },
          props: {
            property: property.name as JsonProp,
            type: TypeEnum.Ref,
            format: Format.TypeFormat.Ref,
            referenceSchema: Type.getTypename(referenceSchema),
            title,
          },
        });
      }
    }).pipe(
      Effect.catchIf(
        (error) => error._tag === 'NoSuchElementException',
        () => Effect.succeed('Recovering from NoSuchElementException'),
      ),
      runAndForwardErrors,
    );
  }

  return view;
};

export type MakeFromDatabaseProps = Omit<MakeWithReferencesProps, 'query' | 'queryRaw' | 'jsonSchema' | 'registry'> & {
  db: Database.Database;
  typename?: string;
  createInitial?: number;
};

/**
 * Create view from a schema in provided space or client.
 */
export const makeFromDatabase = async ({
  db,
  typename,
  createInitial = 1,
  ...props
}: MakeFromDatabaseProps): Promise<{ jsonSchema: JsonSchemaType; view: View.View }> => {
  if (!typename) {
    const type = db.add(createDefaultSchema());
    // `db.add` returns a persisted `Type.Type` entity; its typename lives in the
    // type metadata, so read it via `Type.getTypename` rather than a `.typename` prop.
    typename = Type.getTypename(type);
  } else {
    createInitial = 0;
  }

  const allTypes = await db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run();
  const type = allTypes.find((t) => Type.getTypename(t) === typename);
  invariant(type, `Type not found: ${typename}`);
  // `type` is a `Type.Type` entity (type-kind brand). The kind it *describes*
  // lives in the `TypeAnnotation` on the rebuilt Effect Schema — read it via
  // `Entity.getKind` rather than the entity-level `Type.isObject` guard.
  const effectSchema = Type.getSchema(type);
  invariant(Entity.getKind(effectSchema) === Entity.Kind.Object, `Schema is not an object schema: ${typename}`);
  const jsonSchema = type.jsonSchema;

  Array.from({ length: createInitial }).forEach(() => {
    db.add(Obj.make(Type.assertObject(type), {}));
  });

  return {
    jsonSchema,
    view: await makeWithReferences({
      ...props,
      query: Query.select(Filter.typename(typename)),
      jsonSchema,
      type,
      registry: db.graph.registry,
    }),
  };
};
