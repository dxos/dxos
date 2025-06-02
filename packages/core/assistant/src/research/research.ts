//
// Copyright 2025 DXOS.org
//

import { identity, Option, Schema, SchemaAST } from 'effect';

import { ConsolePrinter, defineTool, ToolResult } from '@dxos/ai';
import { isEncodedReference } from '@dxos/echo-protocol';
import {
  create,
  Filter,
  getEntityKind,
  getSchemaDXN,
  ObjectId,
  Query,
  ReferenceAnnotationId,
  RelationSourceId,
  RelationTargetId,
  type BaseObject,
} from '@dxos/echo-schema';
import { mapAst } from '@dxos/effect';
import { AiService, CredentialsService, DatabaseService, defineFunction } from '@dxos/functions';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { deepMapValues } from '@dxos/util';

import { createExaTool, createMockExaTool } from './exa';
import { Subgraph } from './graph';
// TODO(dmaretskyi): Vite build bug with instruction files with the same filename getting mixed-up
import PROMPT from './instructions-research.tpl?raw';
import { AISession } from '../session';
import { EchoDatabaseImpl, type EchoDatabase } from '@dxos/echo-db';

export const TYPES = [
  DataType.Event,
  DataType.Employer,
  DataType.HasRelationship,
  DataType.Organization,
  DataType.Person,
  DataType.Project,
  DataType.Task,
  DataType.Text,
];

/**
 * Exec external service and return the results as a Subgraph.
 */
// TODO(burdon): Rename.
export const researchFn = defineFunction({
  description: 'Research the web for information',
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),

    // TOOD(burdon): Move to context.
    mockSearch: Schema.optional(Schema.Boolean).annotations({
      description: 'Whether to use the mock search tool.',
      default: false,
    }),
  }),
  outputSchema: Schema.Struct({
    // result: Schema.String,
    result: Subgraph,
  }),
  handler: async ({ data: { query, mockSearch }, context }) => {
    const ai = context.getService(AiService);
    const credentials = context.getService(CredentialsService);
    const { db } = context.getService(DatabaseService);
    // const queues = context.getService(QueuesService);

    const exaCredential = await credentials.getCredential({ service: 'exa.ai' });
    const searchTool = mockSearch ? createMockExaTool() : createExaTool({ apiKey: exaCredential.apiKey! });

    const printer = new ConsolePrinter();
    const session = new AISession({ operationModel: 'configured' });
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));
    session.streamEvent.on((event) => log('stream', { event }));

    // TODO(dmaretskyi): Consider adding this pattern as the "Graph" output mode for the session.
    const outputSchema = createExtractionSchema(TYPES);
    const result = await session.runStructured(outputSchema, {
      client: ai.client,
      systemPrompt: PROMPT,
      artifacts: [],
      tools: [searchTool, createLocalSearchTool(db)],
      history: [],
      prompt: query,
    });
    const data = await sanitizeObjects(TYPES, result as any, db);

    return {
      result: { objects: data },
    };

    // queues.contextQueue!.append(data);

    // return {
    //   result: `
    //   The research results are placed in the following objects:
    //     ${data.map((object, id) => `[obj_${id}][dxn:echo:@:${object.id}]`).join('\n')}
    //   `,
    // };
  },
});

const createLocalSearchTool = (db: EchoDatabase) => {
  return defineTool('example', {
    name: 'local_search',
    description: 'Search the local database for information using a vector index',
    schema: Schema.Struct({
      query: Schema.String.annotations({
        description: 'The query to search for. Could be a question or a topic or a set of keywords.',
      }),
    }),
    execute: async ({ query }) => {
      const { objects } = await db.query(Query.select(Filter.text(query, { type: 'vector' }))).run();
      return ToolResult.Success(`
        <local_context>
          ${JSON.stringify(objects, null, 2)}
        </local_context>
        `);
    },
  });
};

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
): Promise<BaseObject[]> => {
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
        data[RelationSourceId] = sourceDxn;
        data[RelationTargetId] = targetDxn;
      }

      return create(entry.schema, data);
    })
    .filter((object) => !existingIds.has(object.id));

  const { objects } = await db.query(Query.select(Filter.ids(...existingIds))).run();
  const missing = Array.from(existingIds).filter((id) => !objects.some((object) => object.id === id));
  if (missing.length > 0) {
    throw new Error(`Object IDs do not point to existing objects: ${missing.join(', ')}`);
  }

  return res;
};

const SoftRef = Schema.Struct({
  '/': Schema.String,
}).annotations({
  description: 'Reference to another object.',
});

const preprocessSchema = (schema: Schema.Schema.AnyNoContext) => {
  const isRelationSchema = getEntityKind(schema) === 'relation';

  const go = (ast: SchemaAST.AST): SchemaAST.AST => {
    if (SchemaAST.getAnnotation(ast, ReferenceAnnotationId).pipe(Option.isSome)) {
      return SoftRef.ast;
    }

    return mapAst(ast, go);
  };

  return Schema.make<any, any, never>(mapAst(schema.ast, go)).pipe(
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
