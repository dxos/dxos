//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * MCP server connection spec — the minimal fields needed to dial an MCP server.
 *
 * Used as a value type embedded in blueprints and passed to runtime session connect logic.
 * The user-facing ECHO object (`@dxos/assistant-toolkit` `McpServer`) composes this struct
 * and adds instance-level fields (`name`, `enabled`) and ECHO annotations.
 */
export const McpServer = Schema.Struct({
  /** URL of the MCP server. */
  url: Schema.String.annotations({ description: 'URL of the MCP server' }),

  /** Transport protocol. */
  protocol: Schema.Union(Schema.Literal('sse'), Schema.Literal('http')).annotations({
    description: 'Transport protocol of the MCP server',
  }),

  /**
   * Optional API key sent with requests.
   * Persisted in plaintext when stored on a space-replicated ECHO object — see the
   * `@dxos/assistant-toolkit` `McpServer` type for security implications.
   */
  apiKey: Schema.optional(Schema.String).annotations({
    description: 'Optional API key sent with requests',
  }),
});

export interface McpServer extends Schema.Schema.Type<typeof McpServer> {}
