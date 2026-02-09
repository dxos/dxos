//
// Copyright 2025 DXOS.org
//

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
import {
  FormInputAnnotation,
  JsonSchemaType,
  LabelAnnotation,
  type Mutable,
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  SystemTypeAnnotation,
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

import { FieldSchema, type ProjectionChangeCallback, ProjectionModel } from '../projection';
import { createDefaultSchema, getSchema } from '../util';

export const Projection = Schema.Struct({
  /**
   * Optional schema override used to customize the underlying schema.
   */
  schema: JsonSchemaType.pipe(Schema.optional),

  /**
   * UX metadata associated with displayed fields (in table, form, etc.)
   */
  // TODO(wittjosiah): Should this just be an array of JsonPath?
  fields: Schema.Array(FieldSchema),

  /**
   * The id for the field used to pivot the view.
   * E.g., the field to use for kanban columns or the field to use for map coordinates.
   */
  pivotFieldId: Schema.String.pipe(Schema.optional),
});

export type Projection = Schema.Schema.Type<typeof Projection>;

/**
 * Views are generated or user-defined projections of a schema's properties.
 * They are used to configure the visual representation of the data.
 */
const ViewSchema = Schema.Struct({
  /**
   * Query used to retrieve data.
   * Can be a user-provided query grammar string or a query AST.
   */
  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }),

  /**
   * Projection of the data returned from the query.
   */
  projection: Projection,
}).pipe(
  Type.object({
    typename: 'dxos.org/type/View',
    version: '0.5.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface View extends Schema.Schema.Type<typeof ViewSchema> {}

/**
 * View instance type.
 */
// NOTE: This interface is explicitly defined rather than derived from the schema to avoid
//   TypeScript "cannot be named" portability errors. The schema contains QueryAST.Query which
//   references internal @dxos/echo-protocol module paths. Without this explicit interface,
//   any schema using Type.Ref(View) would inherit the non-portable type and fail to compile.
// TODO(wittjosiah): Find a better solution that doesn't require manually keeping the interface in sync.
export const View: Type.Obj<View> = ViewSchema as any;

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
export const make = ({ query, queryRaw, jsonSchema, overrideSchema, fields, pivotFieldName }: MakeProps): View => {
  const view = Obj.make(View, {
    query: { raw: queryRaw, ast: query.ast },
    projection: {
      schema: overrideSchema,
      fields: [],
    },
  });

  // Create change callback that wraps mutations in Obj.change.
  const changeCallback: ProjectionChangeCallback = {
    projection: (mutate) => Obj.change(view, (v) => mutate(v.projection as Mutable<Projection>)),
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
      (v.projection.fields as Mutable<Projection>['fields']).sort((a, b) => {
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
}: MakeWithReferencesProps): Promise<View> => {
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
    projection: (mutate) => Obj.change(view, (v) => mutate(v.projection as Mutable<Projection>)),
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
}: MakeFromDatabaseProps): Promise<{ jsonSchema: JsonSchemaType; view: View }> => {
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

//
// V4
//

const ViewSchemaV4 = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      [SchemaAST.ExamplesAnnotationId]: ['Contact'],
    }),
  ),
  query: Schema.Struct({
    raw: Schema.optional(Schema.String),
    ast: QueryAST.Query,
  }).pipe(FormInputAnnotation.set(false)),
  projection: Projection.pipe(FormInputAnnotation.set(false)),
  presentation: Type.Ref(Type.Obj).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/View',
    version: '0.4.0',
  }),
  LabelAnnotation.set(['name']),
);
export interface ViewV4 extends Schema.Schema.Type<typeof ViewSchemaV4> {}
export const ViewV4: Type.Obj<ViewV4> = ViewSchemaV4 as any;
