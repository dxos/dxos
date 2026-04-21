//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/**
 * MCP server configuration stored as a space-level ECHO object.
 */
export const McpServer = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  protocol: Schema.Union(Schema.Literal('sse'), Schema.Literal('http')),
  apiKey: Schema.optional(Schema.String),
  enabled: Schema.optional(Schema.Boolean),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.assistant.mcpServer',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--plugs-connected--regular',
    hue: 'sky',
  }),
);

export interface McpServer extends Schema.Schema.Type<typeof McpServer> {}
