//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { McpServer } from '@dxos/mcp-server';

import { type LocalServer } from './local-server';

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

/** `listOperations` is absent because `findOperations` lists the same registry, with filters and schemas. */
export const DiscoveryToolkit = Toolkit.make(ListPlugins, ListTypes);

export const discoveryHandlers = (server: LocalServer) =>
  DiscoveryToolkit.of({
    listPlugins: () => Effect.succeed({ plugins: server.plugins }),

    listTypes: () => Effect.succeed({ types: server.types }),
  });
