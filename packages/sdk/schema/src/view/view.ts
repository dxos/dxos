//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Query, QueryAST, Ref, Type } from '@dxos/echo';
import { type EchoSchemaRegistry } from '@dxos/echo-db';
import {
  FormatAnnotation,
  FormatEnum,
  JsonSchemaType,
  LabelAnnotation,
  PropertyMetaAnnotationId,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  type RuntimeSchemaRegistry,
  TypeEnum,
  toEffectSchema,
} from '@dxos/echo-schema';
import { type JsonPath, type JsonProp, findAnnotation } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey } from '@dxos/keys';
import { type Live, live } from '@dxos/live-object';

import { getSchemaProperties } from '../properties';

import { FieldSchema } from './field';
import { ProjectionModel } from './projection-model';
import { FieldSortType } from './sort';

export const Projection = Schema.Struct({
  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: Schema.optional(JsonSchemaType),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  // TODO(wittjosiah): Should this just be an array of JsonPath?
  fields: Schema.mutable(Schema.Array(FieldSchema)),

  /**
   * The id for the field used to pivot the view.
   * E.g., the field to use for kanban columns or the field to use for map coordinates.
   */
  pivotFieldId: Schema.optional(Schema.String),
}).pipe(Schema.mutable);
export type Projection = Schema.Schema.Type<typeof Projection>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 */
const View_ = Schema.Struct({
  /**
   * Name of the view.
   */
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      [SchemaAST.ExamplesAnnotationId]: ['Contact'],
    }),
  ),

  /**
   * Query used to retrieve data.
   * Can be a user-provided query grammar string or a query AST.
   */
  query: Schema.Struct({
    string: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }).pipe(Schema.mutable),

  /**
   * @deprecated Prefer ordering in query.
   */
  sort: Schema.optional(Schema.Array(FieldSortType)),

  /**
   * Projection of the data returned from the query.
   */
  projection: Projection,

  /**
   * Reference to the custom view object which is used to store data specific to rendering.
   */
  presentation: Type.Ref(Type.Expando),
})
  .pipe(LabelAnnotation.set(['name']))
  .pipe(Type.Obj({ typename: 'dxos.org/type/View', version: '0.4.0' }));
export interface View extends Schema.Schema.Type<typeof View_> {}
export interface ViewEncoded extends Schema.Schema.Encoded<typeof View_> {}
export const View: Schema.Schema<View, ViewEncoded> = View_;

/** @deprecated */
// TODO(wittjosiah): Try to remove. Use full query instead.
export const getTypenameFromQuery = (query: QueryAST.Query | undefined) => {
  return query?.type === 'select'
    ? query.filter.type === 'object'
      ? (query.filter.typename?.slice(9) ?? '')
      : ''
    : '';
};

export const createFieldId = () => PublicKey.random().truncate();

type CreateViewProps = {
  name?: string;
  query: Query.Any;
  queryString?: string;
  jsonSchema: JsonSchemaType; // Base schema.
  overrideSchema?: JsonSchemaType; // Override schema.
  presentation: Obj.Any;
  fields?: string[];
  pivotFieldName?: string;
};

// TODO(wittjosiah): Export as `DataType.View.make`.

/**
 * Create view from provided schema.
 */
export const createView = ({
  name,
  query,
  queryString,
  jsonSchema,
  overrideSchema,
  presentation,
  fields: include,
  pivotFieldName,
}: CreateViewProps): Live<View> => {
  const view = Obj.make(View, {
    name,
    query: { string: queryString, ast: query.ast },
    projection: {
      schema: overrideSchema,
      fields: [],
    },
    presentation: Ref.make(presentation),
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

const getSchema = async (
  dxn: DXN,
  registry?: RuntimeSchemaRegistry,
  echoRegistry?: EchoSchemaRegistry,
): Promise<Type.Obj.Any | undefined> => {
  const staticSchema = registry?.getSchemaByDXN(dxn);
  if (staticSchema) {
    return staticSchema;
  }

  const typeDxn = dxn.asTypeDXN();
  if (!typeDxn) {
    return;
  }

  const { type, version } = typeDxn;
  const echoSchema = await echoRegistry?.query({ typename: type, version }).firstOrUndefined();
  return echoSchema?.snapshot;
};

type CreateViewWithReferencesProps = CreateViewProps & {
  // TODO(wittjosiah): Unify these.
  registry?: RuntimeSchemaRegistry;
  echoRegistry?: EchoSchemaRegistry;
};

/**
 * Create view from provided schema with references for fields that are references.
 * Referenced schemas are resolved in the provided registries.
 */
export const createViewWithReferences = async ({
  name,
  query,
  queryString,
  jsonSchema,
  overrideSchema,
  presentation,
  fields,
  pivotFieldName,
  registry,
  echoRegistry,
}: CreateViewWithReferencesProps): Promise<Live<View>> => {
  const view = createView({
    name,
    query,
    queryString,
    jsonSchema,
    overrideSchema,
    presentation,
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

export type CreateViewFromSpaceProps = Omit<
  CreateViewWithReferencesProps,
  'query' | 'queryString' | 'jsonSchema' | 'registry'
> & {
  client?: Client;
  space: Space;
  typename?: string;
  createInitial?: number;
};

/**
 * Create view from a schema in provided space or client.
 */
export const createViewFromSpace = async ({
  client,
  space,
  typename,
  createInitial = 1,
  ...props
}: CreateViewFromSpaceProps): Promise<{ jsonSchema: JsonSchemaType; view: View }> => {
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
    space.db.add(live(schema, {}));
  });

  return {
    jsonSchema,
    view: await createViewWithReferences({
      ...props,
      query: Query.select(Filter.typename(typename)),
      jsonSchema,
      registry: client?.graph.schemaRegistry,
      echoRegistry: space.db.schemaRegistry,
    }),
  };
};

export const createDefaultSchema = () =>
  Schema.Struct({
    title: Schema.optional(Schema.String).annotations({ title: 'Title' }),
    status: Schema.optional(
      Schema.Literal('todo', 'in-progress', 'done')
        .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
        .annotations({
          title: 'Status',
          [PropertyMetaAnnotationId]: {
            singleSelect: {
              options: [
                { id: 'todo', title: 'Todo', color: 'indigo' },
                { id: 'in-progress', title: 'In Progress', color: 'purple' },
                { id: 'done', title: 'Done', color: 'amber' },
              ],
            },
          },
        }),
    ),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
  }).pipe(
    Type.Obj({
      typename: `example.com/type/${PublicKey.random().truncate()}`,
      version: '0.1.0',
    }),
  );
