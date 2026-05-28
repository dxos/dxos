//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { McpServer as McpServerSpec } from '@dxos/compute';
import { DXN, Annotation, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/**
 * MCP server configuration stored as a space-level ECHO object.
 *
 * Composes the canonical connection spec from `@dxos/compute` (`url`, `protocol`, `apiKey`)
 * and adds instance-level fields (`name`, `enabled`) plus ECHO annotations.
 *
 * NOTE: `apiKey` is stored in plaintext and replicated to all peers with access to the space.
 * A future iteration should move secrets to per-device credential storage or use envelope encryption.
 */
export const McpServer = Schema.Struct({
  ...McpServerSpec.McpServer.fields,
  enabled: Schema.optional(Schema.Boolean),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--plugs-connected--regular',
    hue: 'sky',
  }),
  Type.makeObject(DXN.make('org.dxos.type.assistant.mcpServer', '0.1.0')),
);

export type McpServer = Type.InstanceType<typeof McpServer>;
