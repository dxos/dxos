//
// Copyright 2026 DXOS.org
//

// The shape these components consume — a thin metadata-only view of an MCP
// tool definition. Decoupled from `@dxos/introspect-mcp/tools.ToolDefinition`
// (which carries a runtime handler closing over an introspector) so callers
// can supply the metadata however they want: from the static export, from
// `tools/list` over a live MCP transport, or hand-rolled.

import type * as Schema from 'effect/Schema';

export type ToolEntry = {
  /** Human-readable title, e.g. "List Composer plugins". */
  title: string;
  /** LLM-targeted description; usually multi-line. Trim before rendering. */
  description: string;
  /**
   * Effect Schema struct describing the tool's input. Passed straight to
   * `react-ui-form`'s `<Form.Root schema={...}>` — every tool input we ship
   * uses primitives the form renderer understands (string / number / boolean
   * / literal-union / array, plus optional + description annotations).
   */
  inputSchema: Schema.Struct<any>;
};
