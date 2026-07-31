//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * MCP server connection spec — the minimal fields needed to dial an MCP server.
 *
 * Used as a value type embedded in skills and passed to runtime session connect logic.
 * The user-facing ECHO object (`@dxos/assistant-toolkit` `McpServer`) composes this struct
 * and adds instance-level fields (`name`, `enabled`) and ECHO annotations.
 */
export const McpServer = Schema.Struct({
  name: Schema.String.pipe(Schema.optional).annotations({
    description: 'Human-readable name of the MCP server',
  }),

  url: Schema.String.annotations({
    description: 'URL of the MCP server',
  }),

  /**
   * Transport protocol. Prefer `'http'` (Streamable HTTP) for new servers; `'sse'` is
   * kept for compatibility with servers that haven't migrated and is deprecated per
   * the MCP SDK. Clients support both during the migration period.
   */
  protocol: Schema.Union(Schema.Literal('http'), Schema.Literal('sse')).annotations({
    description: 'Transport protocol of the MCP server (prefer "http"; "sse" deprecated)',
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

export type McpServer = Schema.Schema.Type<typeof McpServer>;
