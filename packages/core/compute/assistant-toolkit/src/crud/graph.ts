//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Database, Entity, Feed, Filter, Obj, Query, Type } from '@dxos/echo';
import { isEncodedReference } from '@dxos/echo-protocol';
import {
  ReferenceAnnotationId,
  RelationSourceId,
  RelationTargetId,
  createObject,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
} from '@dxos/echo/internal';
import { mapAst } from '@dxos/effect';
import { DXN, EchoURI, ObjectId, type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { deepMapValues, isNonNullable, trim } from '@dxos/util';

// TODO(burdon): Unify with the graph schema.
export const Subgraph = Schema.Struct({
  /** Objects and relations. */
  objects: Schema.Array(Schema.Any),
});

export type Subgraph = Schema.Schema.Type<typeof Subgraph>;
export type RelatedSchema = {
  schema: Type.AnyEntity;
  kind: 'reference' | 'relation';
};

/**
 * Find all schemas that are related to the given schema.
 *
 * @param db
 * @param schema
 * @returns
 */
export const findRelatedSchema = async (db: Database.Database, anchor: Type.AnyEntity): Promise<RelatedSchema[]> => {
  // TODO(dmaretskyi): Query stored schemas.
  const types = await runAndForwardErrors(db.graph.registry.listTypes());
  const allSchemas = [...types];

  // TODO(dmaretskyi): Also do references.
  return allSchemas
    .filter((type) => {
      const schema = Type.getSchema(type);
      if (getTypeAnnotation(schema)?.kind !== Entity.Kind.Relation) {
        return false;
      }

      return (
        isSchemaAddressableByDXN(anchor, getTypeAnnotation(schema)!.sourceSchema!) ||
        isSchemaAddressableByDXN(anchor, getTypeAnnotation(schema)!.targetSchema!)
      );
    })
    .map(
      (schema): RelatedSchema => ({
        kind: 'relation',
        schema,
      }),
    );
};

/**
 * Non-strict DXN comparison.
 * Returns true if the DXN could be resolved to the schema.
 */
const isSchemaAddressableByDXN = (type: Type.AnyEntity, dxn: DXN.DXN): boolean => {
  if (getTypeIdentifierAnnotation(Type.getSchema(type)) === dxn) {
    return true;
  }

  return DXN.getName(dxn) === Type.getTypename(type);
};

/**
 * Perform vector search in the local database.
 */
// TODO(dmaretskyi): Rename `GraphReadToolkit`.
export const LocalSearchToolkit = Toolkit.make(
  Tool.make('search_local_search', {
    description: 'Search the local database for information using a vector index',
    parameters: {
      query: Schema.String.annotations({
        description: 'The query to search for. Could be a question or a topic or a set of keywords.',
      }),
    },
    success: Schema.Unknown,
    failure: Schema.Never,
    dependencies: [Database.Service, Feed.FeedService],
  }),
);

export const LocalSearchHandler = LocalSearchToolkit.toLayer({
  search_local_search: Effect.fn(function* ({ query }) {
    const objects = yield* Database.runQuery(Query.select(Filter.text(query, { type: 'vector' })));
    const results = [...objects];

    const feedOption = yield* Effect.serviceOption(Feed.ContextFeedService);
    if (Option.isSome(feedOption)) {
      const feedObjects = yield* Feed.runQuery(feedOption.value.feed, Filter.everything());
      // TODO(dmaretskyi): Text search on the feed.
      results.push(...feedObjects);
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
    schema: Type.AnyEntity[];
  }
>() {}

/**
 * Forms typed objects that can be written to the graph database.
 */
export const makeGraphWriterToolkit = ({ schema }: { schema: Type.AnyEntity[] }) => {
  return Toolkit.make(
    Tool.make('graph_writer', {
      description: 'Write to the local graph database',
      parameters: createExtractionSchema(schema).fields,
      success: Schema.Unknown,
      failure: Schema.Never,
      dependencies: [Database.Service, Feed.ContextFeedService, Feed.FeedService],
    }).annotateContext(Context.make(GraphWriterSchema, { schema })),
  );
};

export const makeGraphWriterHandler = (
  toolkit: ReturnType<typeof makeGraphWriterToolkit>,
  {
    onAppend,
  }: {
    onAppend?: (object: URI.URI[]) => void;
  } = {},
) => {
  const { schema } = Context.get(
    toolkit.tools.graph_writer.annotations as Context.Context<GraphWriterSchema>,
    GraphWriterSchema,
  );

  return toolkit.toLayer({
    graph_writer: Effect.fn(function* (input) {
      const { db } = yield* Database.Service;
      const { feed } = yield* Feed.ContextFeedService;
      const data = yield* sanitizeObjects(schema, input as any, db, feed);
      yield* Feed.append(feed, data as Obj.Unknown[]);

      const dxns = data.map((obj) => Entity.getURI(obj));
      onAppend?.(dxns);
      return dxns;
    }),
  });
};

/**
 * Create a schema for structured data extraction.
 */
export const createExtractionSchema = (types: Type.AnyEntity[]) => {
  return Schema.Struct({
    ...Object.fromEntries(
      types
        .map((type) => preprocessSchema(Type.getSchema(type)))
        .map((schema, index) => [
          `objects_${getSanitizedSchemaName(types[index])}`,
          Schema.optional(Schema.Array(schema)).annotations({
            description: `The objects of type: ${DXN.getName(DXN.tryMake(Type.getURI(types[index])!)!)}. ${SchemaAST.getDescriptionAnnotation(Type.getSchema(types[index]).ast).pipe(Option.getOrElse(() => ''))}`,
          }),
        ]),
    ),
  });
};

export const getSanitizedSchemaName = (schema: Type.AnyEntity) => {
  return DXN.getName(DXN.tryMake(Type.getURI(schema)!)!).replaceAll(/[^a-zA-Z0-9]+/g, '_');
};

export const sanitizeObjects = (
  types: Type.AnyEntity[],
  data: Record<string, readonly unknown[]>,
  db: Database.Database,
  feed?: Feed.Feed,
): Effect.Effect<Entity.Unknown[], never, Feed.FeedService> =>
  Effect.gen(function* () {
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
    const enitties = new Map<ObjectId, Entity.Unknown>();

    const resolveId = (id: string): EchoURI.EchoURI | undefined => {
      if (ObjectId.isValid(id)) {
        existingIds.add(id);
        return EchoURI.make({ objectId: id });
      }

      const mappedId = idMap.get(id);
      if (mappedId && ObjectId.isValid(mappedId)) {
        return EchoURI.make({ objectId: mappedId });
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

        let sourceUri: EchoURI.EchoURI | undefined;
        let targetUri: EchoURI.EchoURI | undefined;
        if (Entity.getKind(Type.getSchema(entry.schema)) === 'relation') {
          sourceUri = resolveId(data.source);
          if (!sourceUri) {
            log.warn('source not found', { source: data.source });
          }
          targetUri = resolveId(data.target);
          if (!targetUri) {
            log.warn('target not found', { target: data.target });
          }
          delete data.source;
          delete data.target;
        }

        return {
          data,
          schema: entry.schema,
          sourceUri,
          targetUri,
        };
      })
      .filter((object) => !existingIds.has(object.data.id)); // TODO(dmaretskyi): This dissallows updating existing objects.

    // TODO(dmaretskyi): Use ref resolver.
    const dbObjects = yield* Effect.promise(() => db.query(Query.select(Filter.id(...existingIds))).run());
    const feedObjects = feed && existingIds.size > 0 ? yield* Feed.runQuery(feed, Filter.id(...existingIds)) : [];
    const objects = [...dbObjects, ...feedObjects].filter(isNonNullable);

    // TODO(dmaretskyi): Returns everything if IDs are empty!
    log.info('objects', { dbObjects, feedObjects, existingIds });
    const missing = Array.from(existingIds).filter((id) => !objects.some((object) => object.id === id));
    if (missing.length > 0) {
      throw new Error(`Object IDs do not point to existing objects: ${missing.join(', ')}`);
    }

    return res.flatMap(({ data, schema, sourceUri, targetUri }) => {
      let skip = false;
      if (sourceUri) {
        const id = EchoURI.getObjectId(sourceUri);
        const obj = objects.find((object) => object.id === id) ?? (id ? enitties.get(id) : undefined);
        if (obj) {
          data[RelationSourceId] = obj;
        } else {
          skip = true;
        }
      }
      if (targetUri) {
        const id = EchoURI.getObjectId(targetUri);
        const obj = objects.find((object) => object.id === id) ?? (id ? enitties.get(id) : undefined);
        if (obj) {
          data[RelationTargetId] = obj;
        } else {
          skip = true;
        }
      }
      if (!skip) {
        const obj = createObject(schema, data);
        enitties.set(obj.id, obj);
        return [obj];
      }
      return [];
    });
  });

const SoftRef = Schema.Struct({
  '/': Schema.String,
}).annotations({
  description: 'Reference to another object.',
});

const preprocessSchema = (schema: Schema.Schema.AnyNoContext) => {
  const isRelationSchema = Entity.getKind(schema) === 'relation';

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
      : Function.identity<Schema.Schema.AnyNoContext>,
  );
};
