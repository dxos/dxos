//
// Copyright 2025 DXOS.org
//

import { Tool, Toolkit } from '@effect/ai';
import { Context, Effect, Option, Schema, SchemaAST, identity } from 'effect';

import { Obj, type Relation } from '@dxos/echo';
import { Filter, Query } from '@dxos/echo';
import { type EchoDatabase, type Queue } from '@dxos/echo-db';
import { isEncodedReference } from '@dxos/echo-protocol';
import {
  EntityKind,
  ObjectId,
  ReferenceAnnotationId,
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  create,
  getEntityKind,
  getSchemaDXN,
  getSchemaTypename,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
} from '@dxos/echo/internal';
import { mapAst } from '@dxos/effect';
import { ContextQueueService, DatabaseService } from '@dxos/functions';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { deepMapValues, isNonNullable, trim } from '@dxos/util';

// TODO(burdon): Unify with the graph schema.
export const Subgraph = Schema.Struct({
  /** Objects and relations. */
  objects: Schema.Array(Schema.Any),
});
export interface Subgraph extends Schema.Schema.Type<typeof Subgraph> {}

export type RelatedSchema = {
  schema: Schema.Schema.AnyNoContext;
  kind: 'reference' | 'relation';
};

/**
 * Find all schemas that are related to the given schema.
 *
 * @param db
 * @param schema
 * @returns
 */
export const findRelatedSchema = async (
  db: EchoDatabase,
  anchor: Schema.Schema.AnyNoContext,
): Promise<RelatedSchema[]> => {
  // TODO(dmaretskyi): Query stored schemas.
  const allSchemas = [...db.graph.schemaRegistry.schemas];

  // TODO(dmaretskyi): Also do references.
  return allSchemas
    .filter((schema) => {
      if (getTypeAnnotation(schema)?.kind !== EntityKind.Relation) {
        return false;
      }

      return (
        isSchemaAddressableByDxn(anchor, DXN.parse(getTypeAnnotation(schema)!.sourceSchema!)) ||
        isSchemaAddressableByDxn(anchor, DXN.parse(getTypeAnnotation(schema)!.targetSchema!))
      );
    })
    .map(
      (schema): RelatedSchema => ({
        schema,
        kind: 'relation',
      }),
    );
};

/**
 * Non-strict DXN comparison.
 * Returns true if the DXN could be resolved to the schema.
 */
const isSchemaAddressableByDxn = (schema: Schema.Schema.AnyNoContext, dxn: DXN): boolean => {
  if (getTypeIdentifierAnnotation(schema) === dxn.toString()) {
    return true;
  }

  const t = dxn.asTypeDXN();
  if (t) {
    return t.type === getSchemaTypename(schema);
  }

  return false;
};

/**
 * Perform vector search in the local database.
 */
// TODO(dmaretskyi): Rename `GraphReadToolkit`.
export class LocalSearchToolkit extends Toolkit.make(
  Tool.make('search_local_search', {
    description: 'Search the local database for information using a vector index',
    parameters: {
      query: Schema.String.annotations({
        description: 'The query to search for. Could be a question or a topic or a set of keywords.',
      }),
    },
    success: Schema.Unknown,
    failure: Schema.Never,
    dependencies: [DatabaseService],
  }),
) {}

export const LocalSearchHandler = LocalSearchToolkit.toLayer({
  search_local_search: Effect.fn(function* ({ query }) {
    const { objects } = yield* DatabaseService.runQuery(Query.select(Filter.text(query, { type: 'vector' })));
    const results = [...objects];

    const option = yield* Effect.serviceOption(ContextQueueService);
    if (Option.isSome(option)) {
      const queueObjects = yield* Effect.promise(() => option.value.queue.queryObjects());
      // TODO(dmaretskyi): Text search on the queue.
      results.push(...queueObjects);
    }

    return trim`
      <local_context>
        ${JSON.stringify(results, null, 2)}
      </local_context>
    `;
  }),
});

/**
 * Attached as an annotation to the writer tool.
 */
class GraphWriterSchema extends Context.Tag('@dxos/assistant/GraphWriterSchema')<
  GraphWriterSchema,
  {
    schema: Schema.Schema.AnyNoContext[];
  }
>() {}

/**
 * Forms typed objects that can be written to the graph database.
 */
export const makeGraphWriterToolkit = ({ schema }: { schema: Schema.Schema.AnyNoContext[] }) => {
  return Toolkit.make(
    Tool.make('graph_writer', {
      description: 'Write to the local graph database',
      parameters: createExtractionSchema(schema).fields,
      success: Schema.Unknown,
      failure: Schema.Never,
      dependencies: [DatabaseService, ContextQueueService],
    }).annotateContext(Context.make(GraphWriterSchema, { schema })),
  );
};

export const makeGraphWriterHandler = (
  toolkit: ReturnType<typeof makeGraphWriterToolkit>,
  {
    onAppend,
  }: {
    onAppend?: (object: DXN[]) => void;
  } = {},
) => {
  const { schema } = Context.get(
    toolkit.tools.graph_writer.annotations as Context.Context<GraphWriterSchema>,
    GraphWriterSchema,
  );

  return toolkit.toLayer({
    graph_writer: Effect.fn(function* (input) {
      const { db } = yield* DatabaseService;
      const { queue } = yield* ContextQueueService;
      const data = yield* Effect.promise(() => sanitizeObjects(schema, input as any, db, queue));
      yield* Effect.promise(() => queue.append(data as Obj.Any[]));

      const dxns = data.map((obj) => Obj.getDXN(obj));
      onAppend?.(dxns);
      return dxns;
    }),
  });
};

/**
 * Create a schema for structured data extraction.
 */
export const createExtractionSchema = (types: Schema.Schema.AnyNoContext[]) => {
  return Schema.Struct({
    ...Object.fromEntries(
      types.map(preprocessSchema).map((schema, index) => [
        `objects_${getSanitizedSchemaName(types[index])}`,
        Schema.optional(Schema.Array(schema)).annotations({
          description: `The objects of type: ${getSchemaDXN(types[index])?.asTypeDXN()!.type}. ${SchemaAST.getDescriptionAnnotation(types[index].ast).pipe(Option.getOrElse(() => ''))}`,
        }),
      ]),
    ),
  });
};

export const getSanitizedSchemaName = (schema: Schema.Schema.AnyNoContext) => {
  return getSchemaDXN(schema)!
    .asTypeDXN()!
    .type.replaceAll(/[^a-zA-Z0-9]+/g, '_');
};

export const sanitizeObjects = async (
  types: Schema.Schema.AnyNoContext[],
  data: Record<string, readonly unknown[]>,
  db: EchoDatabase,
  queue?: Queue,
): Promise<Obj.Any[]> => {
  const entries = types
    .map(
      (type) =>
        data[`objects_${getSanitizedSchemaName(type)}`]?.map((object: any) => ({
          data: object,
          schema: type,
        })) ?? [],
    )
    .flat();

  const idMap = new Map<string, string>();
  const existingIds = new Set<ObjectId>();
  const enitties = new Map<ObjectId, Obj.Any | Relation.Any>();

  const resolveId = (id: string): DXN | undefined => {
    if (ObjectId.isValid(id)) {
      existingIds.add(id);
      return DXN.fromLocalObjectId(id);
    }

    const mappedId = idMap.get(id);
    if (mappedId) {
      return DXN.fromLocalObjectId(mappedId);
    }

    return undefined;
  };

  const res = entries
    .map((entry) => {
      // This entry mutates existing object.
      if (ObjectId.isValid(entry.data.id)) {
        return entry;
      }

      idMap.set(entry.data.id, ObjectId.random());
      entry.data.id = idMap.get(entry.data.id);
      return entry;
    })
    .map((entry) => {
      const data = deepMapValues(entry.data, (value, recurse) => {
        if (isEncodedReference(value)) {
          const ref = value['/'];
          const id = resolveId(ref);

          if (id) {
            // Link to an existing object.
            return { '/': id.toString() };
          } else {
            // Search URIs?
            return { '/': `search:?q=${encodeURIComponent(ref)}` };
          }
        }

        return recurse(value);
      });

      if (getEntityKind(entry.schema) === 'relation') {
        const sourceDxn = resolveId(data.source);
        if (!sourceDxn) {
          log.warn('source not found', { source: data.source });
        }
        const targetDxn = resolveId(data.target);
        if (!targetDxn) {
          log.warn('target not found', { target: data.target });
        }
        delete data.source;
        delete data.target;
        data[RelationSourceDXNId] = sourceDxn;
        data[RelationTargetDXNId] = targetDxn;
      }

      return {
        data,
        schema: entry.schema,
      };
    })
    .filter((object) => !existingIds.has(object.data.id)); // TODO(dmaretskyi): This dissallows updating existing objects.

  // TODO(dmaretskyi): Use ref resolver.
  const { objects: dbObjects } = await db.query(Query.select(Filter.ids(...existingIds))).run();
  const queueObjects = (await queue?.getObjectsById([...existingIds])) ?? [];
  const objects = [...dbObjects, ...queueObjects].filter(isNonNullable);

  // TODO(dmaretskyi): Returns everything if IDs are empty!
  log.info('objects', { dbObjects, queueObjects, existingIds });
  const missing = Array.from(existingIds).filter((id) => !objects.some((object) => object.id === id));
  if (missing.length > 0) {
    throw new Error(`Object IDs do not point to existing objects: ${missing.join(', ')}`);
  }

  return res.flatMap(({ data, schema }) => {
    let skip = false;
    if (RelationSourceDXNId in data) {
      const id = (data[RelationSourceDXNId] as DXN).asEchoDXN()?.echoId;
      const obj = objects.find((object) => object.id === id) ?? enitties.get(id!);
      if (obj) {
        delete data[RelationSourceDXNId];
        data[RelationSourceId] = obj;
      } else {
        skip = true;
      }
    }
    if (RelationTargetDXNId in data) {
      const id = (data[RelationTargetDXNId] as DXN).asEchoDXN()?.echoId;
      const obj = objects.find((object) => object.id === id) ?? enitties.get(id!);
      if (obj) {
        delete data[RelationTargetDXNId];
        data[RelationTargetId] = obj;
      } else {
        skip = true;
      }
    }
    if (!skip) {
      const obj = create(schema, data);
      enitties.set(obj.id, obj);
      return [obj];
    }
    return [];
  });
};

const SoftRef = Schema.Struct({
  '/': Schema.String,
}).annotations({
  description: 'Reference to another object.',
});

const preprocessSchema = (schema: Schema.Schema.AnyNoContext) => {
  const isRelationSchema = getEntityKind(schema) === 'relation';

  const go = (ast: SchemaAST.AST, visited = new Set<SchemaAST.AST>()): SchemaAST.AST => {
    if (visited.has(ast)) {
      // Already visited this node, prevent infinite recursion.
      return ast;
    }
    visited.add(ast);

    if (SchemaAST.getAnnotation(ast, ReferenceAnnotationId).pipe(Option.isSome)) {
      return SoftRef.ast;
    }

    return mapAst(ast, (child) => go(child, visited));
  };

  return Schema.make<any, any, never>(mapAst(schema.ast, (ast) => go(ast))).pipe(
    Schema.omit('id'),
    Schema.extend(
      Schema.Struct({
        id: Schema.String.annotations({
          description: 'The id of this object. Come up with a unique id based on your judgement.',
        }),
      }),
    ),
    isRelationSchema
      ? Schema.extend(
          Schema.Struct({
            source: Schema.String.annotations({
              description: 'The id of the source object for this relation.',
            }),
            target: Schema.String.annotations({
              description: 'The id of the target object for this relation.',
            }),
          }),
        )
      : identity<Schema.Schema.AnyNoContext>,
  );
};
