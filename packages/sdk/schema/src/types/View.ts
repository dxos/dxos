//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Query, QueryAST, Type } from '@dxos/echo';
import {
  FormatEnum,
  JsonSchemaType,
  LabelAnnotation,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  type RuntimeSchemaRegistry,
  TypeEnum,
  toEffectSchema,
} from '@dxos/echo/internal';
import { type EchoSchemaRegistry } from '@dxos/echo-db';
import { type JsonPath, type JsonProp, findAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Live } from '@dxos/live-object';

import { SystemAnnotation } from '../annotations';
import { FieldSchema, FieldSortType, ProjectionModel, getSchemaProperties } from '../projection';

import { createDefaultSchema, getSchema } from './util';

export const Projection = Schema.Struct({
  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: JsonSchemaType.pipe(Schema.optional),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  // TODO(wittjosiah): Should this just be an array of JsonPath?
  fields: Schema.Array(FieldSchema).pipe(Schema.mutable),

  /**
   * The id for the field used to pivot the view.
   * E.g., the field to use for kanban columns or the field to use for map coordinates.
   */
  pivotFieldId: Schema.String.pipe(Schema.optional),
}).pipe(Schema.mutable);

export type Projection = Schema.Schema.Type<typeof Projection>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 */
export const ViewSchema = Schema.Struct({
  /**
   * Query used to retrieve data.
   * Can be a user-provided query grammar string or a query AST.
   */
  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }).pipe(Schema.mutable),

  /**
   * @deprecated Prefer ordering in query.
   */
  sort: Schema.Array(FieldSortType).pipe(Schema.optional),

  /**
   * Projection of the data returned from the query.
   */
  projection: Projection,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/View',
    version: '0.4.0',
  }),
  SystemAnnotation.set(true),
);

// TODO(burdon): Workaround for build issue: TS2742.
//  See "import { View as _View } ..."
export interface View extends Schema.Schema.Type<typeof ViewSchema> {}
export interface ViewEncoded extends Schema.Schema.Encoded<typeof ViewSchema> {}
export const View: Schema.Schema<View, ViewEncoded> = ViewSchema;

export type MakeProps = {
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
export const make = ({
  query,
  queryRaw,
  jsonSchema,
  overrideSchema,
  fields: include,
  pivotFieldName,
}: MakeProps): Live<View> => {
  const view = Obj.make(View, {
    query: { raw: queryRaw, ast: query.ast },
    projection: {
      schema: overrideSchema,
      fields: [],
    },
  });

  const projection = new ProjectionModel(jsonSchema, view.projection);
  projection.normalizeView();
  const schema = toEffectSchema(jsonSchema);
  const shouldIncludeId = include?.find((field) => field === 'id') !== undefined;
  const properties = getSchemaProperties(schema.ast, {}, shouldIncludeId);
  for (const property of properties) {
    if (include && !include.includes(property.name)) {
      continue;
    }

    // Omit objects from initial projection as they are difficult to handle automatically.
    if (property.type === 'object' && !property.format) {
      continue;
    }

    projection.showFieldProjection(property.name as JsonProp);
  }

  // Sort fields to match the order in the params.
  if (include) {
    view.projection.fields.sort((a, b) => {
      const indexA = include.indexOf(a.path);
      const indexB = include.indexOf(b.path);
      return indexA - indexB;
    });
  }

  if (pivotFieldName) {
    const fieldId = projection.getFieldId(pivotFieldName);
    if (fieldId) {
      view.projection.pivotFieldId = fieldId;
    }
  }

  return view;
};

export type MakeWithReferencesProps = MakeProps & {
  // TODO(wittjosiah): Unify these.
  registry?: RuntimeSchemaRegistry;
  echoRegistry?: EchoSchemaRegistry;
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
  echoRegistry,
}: MakeWithReferencesProps): Promise<Live<View>> => {
  const view = make({
    query,
    queryRaw,
    jsonSchema,
    overrideSchema,
    fields,
    pivotFieldName,
  });

  const projection = new ProjectionModel(jsonSchema, view.projection);
  const schema = toEffectSchema(jsonSchema);
  const shouldIncludeId = fields?.find((field) => field === 'id') !== undefined;
  const properties = getSchemaProperties(schema.ast, {}, shouldIncludeId);
  for (const property of properties) {
    if (fields && !fields.includes(property.name)) {
      continue;
    }

    if (property.format !== FormatEnum.Ref) {
      continue;
    }

    projection.showFieldProjection(property.name as JsonProp);

    await Effect.gen(function* () {
      const referenceDxn = yield* Function.pipe(
        findAnnotation<ReferenceAnnotationValue>(property.ast, ReferenceAnnotationId),
        Option.fromNullable,
        Option.map((ref) => DXN.fromTypenameAndVersion(ref.typename, ref.version)),
      );

      const referenceSchema = yield* Effect.tryPromise(() => getSchema(referenceDxn, registry, echoRegistry));

      const referencePath = yield* Function.pipe(
        Option.fromNullable(referenceSchema),
        Option.flatMap((schema) => LabelAnnotation.get(schema)),
        Option.flatMap((labels) => (labels.length > 0 ? Option.some(labels[0]) : Option.none())),
      );

      if (referenceSchema && referencePath) {
        const fieldId = yield* Option.fromNullable(view.projection.fields?.find((f) => f.path === property.name)?.id);
        projection.setFieldProjection({
          field: {
            id: fieldId,
            path: property.name as JsonPath,
            referencePath: referencePath as JsonPath,
          },
          props: {
            property: property.name as JsonProp,
            type: TypeEnum.Ref,
            format: FormatEnum.Ref,
            referenceSchema: Type.getTypename(referenceSchema),
            title: property.title,
          },
        });
      }
    }).pipe(
      Effect.catchIf(
        (error) => error._tag === 'NoSuchElementException',
        () => Effect.succeed('Recovering from NoSuchElementException'),
      ),
      Effect.runPromise,
    );
  }

  return view;
};

export type MakeFromSpaceProps = Omit<MakeWithReferencesProps, 'query' | 'queryRaw' | 'jsonSchema' | 'registry'> & {
  client?: Client;
  space: Space;
  typename?: string;
  createInitial?: number;
};

/**
 * Create view from a schema in provided space or client.
 */
export const makeFromSpace = async ({
  client,
  space,
  typename,
  createInitial = 1,
  ...props
}: MakeFromSpaceProps): Promise<{ jsonSchema: JsonSchemaType; view: View }> => {
  if (!typename) {
    const [schema] = await space.db.schemaRegistry.register([createDefaultSchema()]);
    typename = schema.typename;
  } else {
    createInitial = 0;
  }

  const staticSchema = client?.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
  const dynamicSchema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
  const jsonSchema = staticSchema ? Type.toJsonSchema(staticSchema) : dynamicSchema?.jsonSchema;
  invariant(jsonSchema, `Schema not found: ${typename}`);
  const schema = staticSchema ?? dynamicSchema;
  invariant(schema, `Schema not found: ${typename}`);

  Array.from({ length: createInitial }).forEach(() => {
    space.db.add(Obj.make(schema, {}));
  });

  return {
    jsonSchema,
    view: await makeWithReferences({
      ...props,
      query: Query.select(Filter.typename(typename)),
      jsonSchema,
      registry: client?.graph.schemaRegistry,
      echoRegistry: space.db.schemaRegistry,
    }),
  };
};
