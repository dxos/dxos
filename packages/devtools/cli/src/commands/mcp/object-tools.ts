//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { Server } from '@dxos/mcp-server';

import { type LocalGateway } from './gateway';

/**
 * Generic object CRUD over the `database.*` operations, mirroring EDGE's `mcp-space-service` tools
 * of the same names. Domain logic stays in the operations; these only shape the model-facing
 * surface.
 *
 * TODO(wittjosiah): Duplicated with edge's `src/mcp/object-tools.ts`. Both should become annotated
 *   operations contributed by a plugin, so each host projects them through `@dxos/mcp-server`
 *   rather than hand-writing a toolkit — the same route the project and task verbs already take.
 *   Until then a change to either tool's shape has to be made twice.
 */
const DatabaseOperationKeys = {
  query: 'org.dxos.function.database.query',
  load: 'org.dxos.function.database.load',
  objectCreate: 'org.dxos.function.database.objectCreate',
  objectUpdate: 'org.dxos.function.database.objectUpdate',
  objectDelete: 'org.dxos.function.database.objectDelete',
} as const;

/** Text edits route through the markdown update operation (any text-bearing document). */
const MARKDOWN_UPDATE_KEY = 'org.dxos.function.markdown.update';

const objectIdParameter = Schema.String.annotate({
  description: 'Object id (an echo:// URI, as returned by createObject or queryObjects).',
});

const typenameParameter = Schema.String.annotate({
  description: 'ECHO typename (e.g. org.dxos.type.task). Use listTypes for the registered set.',
});

const expandDepthParameter = Schema.optional(Schema.Number).annotate({
  description:
    'Inline referenced objects instead of returning their { "/": "echo:..." } envelope, this many ' +
    'levels deep. 0 (default) returns envelopes; 1 is the maximum. Use it to read a document with ' +
    'its content, or a task with its assignee, without a second call.',
});

const EditSchema = Schema.Struct({
  oldString: Schema.optional(Schema.String).annotate({
    description: 'The text to find in the document. Omit to append newString to the end of the document.',
  }),
  newString: Schema.String.annotate({ description: 'The text to replace it with.' }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

export const CreateObject = Tool.make('createObject', {
  description:
    'Creates an object of the given type in the space. The type must be registered (see listTypes). ' +
    'The object appears live in Composer. Reference values use the envelope form { "/": "echo:..." }.',
  parameters: Schema.Struct({
    typename: typenameParameter,
    properties: Schema.Record(Schema.String, Schema.Any).annotate({
      description: 'Object properties, matching the type schema (see listTypes).',
    }),
    spaceId: Server.spaceIdParameter,
  }),
  success: Schema.Struct({
    object: Schema.Unknown.annotate({ description: 'The created object, including its id.' }),
  }),
  failure: Server.ToolFailure,
});

export const GetObject = Tool.make('getObject', {
  description: 'Loads an object by id and returns its content (a point-in-time snapshot).',
  parameters: Schema.Struct({
    id: objectIdParameter,
    expandDepth: expandDepthParameter,
    spaceId: Server.spaceIdParameter,
  }),
  success: Schema.Struct({ object: Schema.Unknown }),
  failure: Server.ToolFailure,
});

export const UpdateObject = Tool.make('updateObject', {
  description:
    'Updates an object. Pass `properties` to patch fields (field values replace existing ones), or ' +
    '`edits` to apply find/replace edits to a text-bearing document (markdown documents, outlines). ' +
    'Exactly one of the two must be provided.',
  parameters: Schema.Struct({
    id: objectIdParameter,
    properties: Schema.optional(Schema.Record(Schema.String, Schema.Any)).annotate({
      description: 'Field patch, matching the type schema.',
    }),
    edits: Schema.optional(Schema.Array(EditSchema)).annotate({
      description: 'Text edits for a text-bearing document; applied in order.',
    }),
    spaceId: Server.spaceIdParameter,
  }),
  success: Schema.Struct({
    object: Schema.optional(Schema.Unknown).annotate({ description: 'The updated object (property patch).' }),
    newContent: Schema.optional(Schema.String).annotate({ description: 'The text content after edits.' }),
  }),
  failure: Server.ToolFailure,
});

export const DeleteObject = Tool.make('deleteObject', {
  description: 'Deletes an object from the space.',
  parameters: Schema.Struct({
    id: objectIdParameter,
    spaceId: Server.spaceIdParameter,
  }),
  success: Schema.Struct({ deleted: Schema.Boolean }),
  failure: Server.ToolFailure,
});

export const QueryObjects = Tool.make('queryObjects', {
  description:
    'Queries the space for objects by typename and/or full-text search. Omit both to list all objects. ' +
    'The typename filter matches every version of the type. ' +
    'Set includeContent=false for large result sets, then load specific objects with getObject.',
  parameters: Schema.Struct({
    typename: Schema.optional(typenameParameter),
    text: Schema.optional(Schema.String).annotate({ description: 'Full-text search terms.' }),
    includeContent: Schema.optional(Schema.Boolean).annotate({
      description: 'Return full object data (default true); false returns id/type/label only.',
    }),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Maximum number of results.' }),
    includeQueues: Schema.optional(Schema.Boolean).annotate({
      description:
        'Also search the space queues (default false). Queue-backed content — mailbox emails, ' +
        'calendar events — lives behind a feed ref and is invisible without this.',
    }),
    expandDepth: expandDepthParameter,
    spaceId: Server.spaceIdParameter,
  }),
  success: Schema.Struct({ results: Schema.Array(Schema.Unknown) }),
  failure: Server.ToolFailure,
});

export const ObjectToolkit = Toolkit.make(CreateObject, GetObject, UpdateObject, DeleteObject, QueryObjects);

/** JSON ref envelope decoded by the operation's input schema back into a live `Ref`. */
const toRefEnvelope = (id: string): { '/': string } => ({ '/': id });

/**
 * Drops keys whose value is `undefined` so they never reach an operation's input.
 *
 * An unset tool parameter must be *absent*, not present-and-undefined: operation input decoding
 * rejects excess properties outright rather than ignoring them.
 */
const optional = (fields: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

/** The markdown update operation reports the post-edit text; anything else leaves it unset. */
const newContentOf = (output: unknown): string | undefined => {
  if (typeof output !== 'object' || output === null) {
    return undefined;
  }
  const content = Reflect.get(output, 'newContent');
  return typeof content === 'string' ? content : undefined;
};

type CallRequest = { readonly key: string; readonly input: unknown; readonly spaceId: string };

/**
 * Invokes an operation through the gateway and shapes its failure as a tool failure, so these
 * toolkits report errors the way every projected tool does.
 */
const call = (
  gateway: LocalGateway,
  { key, input, spaceId }: CallRequest,
): Effect.Effect<unknown, Server.ToolFailure> =>
  gateway.invokeOperation({ key, input, spaceId }).pipe(
    // Same qualification the projected handlers apply: a same-space reference serializes without a
    // space, which an agent cannot carry back into a later call.
    Effect.map((output) => Server.qualifyRefs(output, spaceId)),
    Effect.mapError((error) => Server.failure('operation_failed', error.message)),
  );

export const objectHandlers = (gateway: LocalGateway) =>
  ObjectToolkit.of({
    createObject: ({ typename, properties, spaceId }) =>
      Server.resolveSpaceId(gateway.spaceIds, spaceId).pipe(
        Effect.flatMap((resolvedSpaceId) =>
          call(gateway, {
            key: DatabaseOperationKeys.objectCreate,
            input: { typename, properties },
            spaceId: resolvedSpaceId,
          }),
        ),
        Effect.map((object) => ({ object })),
      ),

    getObject: ({ id, expandDepth, spaceId }) =>
      Server.resolveSpaceId(gateway.spaceIds, spaceId).pipe(
        Effect.flatMap((resolvedSpaceId) =>
          call(gateway, {
            key: DatabaseOperationKeys.load,
            input: { refs: [toRefEnvelope(id)], ...optional({ expandDepth }) },
            spaceId: resolvedSpaceId,
          }),
        ),
        // `database.load` takes an array of refs; a single-id tool keeps the model-facing surface
        // simple, so unwrap the singleton result.
        Effect.map((output) => ({ object: Array.isArray(output) ? output[0] : output })),
      ),

    updateObject: ({ id, properties, edits, spaceId }) =>
      Effect.gen(function* () {
        if ((properties == null) === (edits == null)) {
          return yield* Effect.fail(Server.failure('invalid_request', 'Pass exactly one of `properties` or `edits`.'));
        }
        const resolvedSpaceId = yield* Server.resolveSpaceId(gateway.spaceIds, spaceId);
        if (properties != null) {
          const object = yield* call(gateway, {
            key: DatabaseOperationKeys.objectUpdate,
            input: { obj: toRefEnvelope(id), properties },
            spaceId: resolvedSpaceId,
          });
          return { object };
        }
        const output = yield* call(gateway, {
          key: MARKDOWN_UPDATE_KEY,
          input: { doc: toRefEnvelope(id), edits },
          spaceId: resolvedSpaceId,
        });
        return { newContent: newContentOf(output) };
      }),

    deleteObject: ({ id, spaceId }) =>
      Server.resolveSpaceId(gateway.spaceIds, spaceId).pipe(
        Effect.flatMap((resolvedSpaceId) =>
          call(gateway, {
            key: DatabaseOperationKeys.objectDelete,
            input: { obj: toRefEnvelope(id) },
            spaceId: resolvedSpaceId,
          }),
        ),
        Effect.map(() => ({ deleted: true })),
      ),

    queryObjects: ({ typename, text, includeContent, limit, includeQueues, expandDepth, spaceId }) =>
      Server.resolveSpaceId(gateway.spaceIds, spaceId).pipe(
        Effect.flatMap((resolvedSpaceId) =>
          call(gateway, {
            key: DatabaseOperationKeys.query,
            input: optional({ typename, text, includeContent, limit, includeQueues, expandDepth }),
            spaceId: resolvedSpaceId,
          }),
        ),
        Effect.map((output) => ({ results: Array.isArray(output) ? output : [output] })),
      ),
  });
