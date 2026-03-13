//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';
import type * as Types from 'effect/Types';

import {
  type Database,
  Filter,
  Format,
  JsonSchema,
  Obj,
  Query,
  QueryAST,
  Ref,
  type SchemaRegistry,
  Type,
} from '@dxos/echo';
import { View } from '@dxos/echo';
import {
  FormInputAnnotation,
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

import { type ProjectionChangeCallback, ProjectionModel } from '../projection';
import { createDefaultSchema, getSchema } from '../util';

type MakeProps = {
  name?: string;
  query: Query.Any;
  queryRaw?: string;
  jsonSchema: JsonSchemaType; // Base schema.
  overrideSchema?: JsonSchemaType; // Override schema.
  fields?: string[];
  pivotFieldName?: string;
};

/**
 * Create view from provided schema.
 */
export const make = ({ query, queryRaw, jsonSchema, overrideSchema, fields, pivotFieldName }: MakeProps): View.View => {
  const view = Obj.make(View.View, {
    query: { raw: queryRaw, ast: query.ast },
    projection: {
      schema: overrideSchema,
      fields: [],
    },
  });

  // Create change callback that wraps mutations in Obj.change.
  const changeCallback: ProjectionChangeCallback = {
    projection: (mutate) => Obj.change(view, (v) => mutate(v.projection as Mutable<View.Projection>)),
    schema: (mutate) => mutate(jsonSchema as Types.DeepMutable<JsonSchema.JsonSchema>),
  };

  const projection = new ProjectionModel({
    view,
    baseSchema: jsonSchema,
    change: changeCallback,
  });
  projection.normalizeView();
  const schema = toEffectSchema(jsonSchema);
  const properties = getProperties(schema.ast);
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
    Obj.change(view, (v) => {
      (v.projection.fields as Mutable<View.Projection>['fields']).sort((a, b) => {
        const indexA = fields.indexOf(a.path);
        const indexB = fields.indexOf(b.path);
        return indexA - indexB;
      });
    });
  }

  if (pivotFieldName) {
    const fieldId = projection.getFieldId(pivotFieldName);
    if (fieldId) {
      Obj.change(view, (v) => {
        v.projection.pivotFieldId = fieldId;
      });
    }
  }

  return view;
};

export type MakeWithReferencesProps = MakeProps & {
  registry?: SchemaRegistry.SchemaRegistry;
};

/**
 * Create view from provided schema with references for fields that are references.
 * Referenced schemas are resolved in the provided registries.
 */
export const makeWithReferences = async ({
  query,
  queryRaw,
  jsonSchema,
  overrideSchema,
  fields,
  pivotFieldName,
  registry,
}: MakeWithReferencesProps): Promise<View.View> => {
  const view = make({
    query,
    queryRaw,
    jsonSchema,
    overrideSchema,
    fields,
    pivotFieldName,
  });

  // Create change callback that wraps mutations in Obj.change.
  const changeCallback: ProjectionChangeCallback = {
    projection: (mutate) => Obj.change(view, (v) => mutate(v.projection as Mutable<View.Projection>)),
    schema: (mutate) => mutate(jsonSchema as Types.DeepMutable<JsonSchema.JsonSchema>),
  };

  const projection = new ProjectionModel({
    view,
    baseSchema: jsonSchema,
    change: changeCallback,
  });
  const schema = toEffectSchema(jsonSchema);
  const properties = getProperties(schema.ast);
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
      const referenceDxn = yield* Function.pipe(
        findAnnotation<ReferenceAnnotationValue>(property.type, ReferenceAnnotationId),
        Option.fromNullable,
        Option.map((ref) => DXN.fromTypenameAndVersion(ref.typename, ref.version)),
      );

      const referenceSchema = yield* Effect.tryPromise(() => getSchema(referenceDxn, registry));

      const referencePath = yield* Function.pipe(
        Option.fromNullable(referenceSchema),
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
    const [schema] = await db.schemaRegistry.register([createDefaultSchema()]);
    typename = schema.typename;
  } else {
    createInitial = 0;
  }

  const schema = await db.schemaRegistry.query({ typename, location: ['database', 'runtime'] }).firstOrUndefined();
  const jsonSchema = schema && JsonSchema.toJsonSchema(schema);
  invariant(jsonSchema, `Schema not found: ${typename}`);
  invariant(schema && Type.isObjectSchema(schema), `Schema is not an object schema: ${typename}`);

  Array.from({ length: createInitial }).forEach(() => {
    db.add(Obj.make(schema, {}));
  });

  return {
    jsonSchema,
    view: await makeWithReferences({
      ...props,
      query: Query.select(Filter.typename(typename)),
      jsonSchema,
      registry: db.schemaRegistry,
    }),
  };
};
