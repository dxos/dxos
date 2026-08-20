//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { McpServer } from '@dxos/mcp-server';

import { type LocalRegistry } from './registry';

/**
 * Read-only discovery over what this host assembled, mirroring EDGE's `mcp-space-service` tools of
 * the same names. No space context required.
 *
 * TODO(wittjosiah): Duplicated with edge's `src/mcp/discovery-tools.ts`. Both should become
 *   annotated operations contributed by a plugin, so each host projects them through
 *   `@dxos/mcp-server` rather than hand-writing a toolkit — the same route the project and task
 *   verbs already take. Until then a change to either tool's shape has to be made twice.
 */

export const ListPlugins = Tool.make('listPlugins', {
  description: 'Lists the plugins activated on the operation service.',
  parameters: Schema.Struct({}),
  success: Schema.Struct({
    plugins: Schema.Array(
      Schema.Struct({
        key: Schema.String,
        name: Schema.optional(Schema.String),
      }),
    ),
  }),
  failure: McpServer.ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const ListTypes = Tool.make('listTypes', {
  description:
    'Lists the ECHO types registered on the operation service — the typenames accepted by ' +
    'createObject and queryObjects.',
  parameters: Schema.Struct({}),
  success: Schema.Struct({
    types: Schema.Array(
      Schema.Struct({
        typename: Schema.String,
        version: Schema.String,
      }),
    ),
  }),
  failure: McpServer.ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const ListOperations = Tool.make('listOperations', {
  description: 'Lists the operations registered on the operation service.',
  parameters: Schema.Struct({}),
  success: Schema.Struct({
    operations: Schema.Array(
      Schema.Struct({
        key: Schema.String.annotate({ description: 'Operation key, as passed to an operation invocation.' }),
        version: Schema.optional(Schema.String),
        name: Schema.optional(Schema.String),
        description: Schema.optional(Schema.String),
      }),
    ),
  }),
  failure: McpServer.ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const DiscoveryToolkit = Toolkit.make(ListPlugins, ListTypes, ListOperations);

/** Projects a JSON field that a model can act on, dropping absent and non-string values. */
const optionalString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `key` and `version` live under the record's `@meta`, not on its own properties. */
const metaString = (operation: Record<string, unknown>, field: string): string | undefined => {
  const meta = operation['@meta'];
  return isRecord(meta) ? optionalString(meta[field]) : undefined;
};

export const discoveryHandlers = (registry: LocalRegistry) =>
  DiscoveryToolkit.of({
    listPlugins: () => Effect.succeed({ plugins: registry.plugins }),

    listTypes: () => Effect.succeed({ types: registry.types }),

    listOperations: () =>
      registry.listOperations.pipe(
        // Serialized `PersistentOperation` records carry schemas and metadata; project the fields a
        // model needs to pick an operation, not the whole record.
        Effect.map((operations) => ({
          operations: operations.map((operation) => ({
            key: metaString(operation, 'key') ?? '',
            version: metaString(operation, 'version'),
            name: optionalString(operation.name),
            description: optionalString(operation.description),
          })),
        })),
        Effect.mapError((error) => McpServer.failure('operation_failed', error.message)),
      ),
  });
