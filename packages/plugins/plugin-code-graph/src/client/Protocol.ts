//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** The dev-server route both halves agree on: the browser posts here, the vite plugin answers. */
export const PATH = '/api/code-index';

/** The read-only tools `code-index mcp` serves (tools/code-index/src/mcp/Server.ts). */
export const Tool = Schema.Literals(['vocabulary', 'describe', 'usages', 'query', 'ask', 'files', 'stats']);
export type Tool = Schema.Schema.Type<typeof Tool>;

export const Request = Schema.Struct({
  tool: Tool,
  args: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});
export type Request = Schema.Schema.Type<typeof Request>;

/** A tool's structured result, or the reason there is none. */
export const Response = Schema.Union([
  Schema.Struct({ ok: Schema.Literal(true), result: Schema.Unknown }),
  Schema.Struct({ ok: Schema.Literal(false), error: Schema.String }),
]);
export type Response = Schema.Schema.Type<typeof Response>;

export const QueryResult = Schema.Struct({
  vars: Schema.Array(Schema.String),
  rows: Schema.Array(Schema.Record(Schema.String, Schema.String)),
  truncated: Schema.optional(Schema.Boolean),
  warnings: Schema.optional(Schema.Array(Schema.String)),
});
export type QueryResult = Schema.Schema.Type<typeof QueryResult>;

export const Triple = Schema.Struct({
  predicate: Schema.String,
  object: Schema.String,
  objectKind: Schema.optional(Schema.String),
});

export const DescribeResult = Schema.Struct({
  iri: Schema.optional(Schema.String),
  candidates: Schema.optional(Schema.Array(Schema.Unknown)),
  outgoing: Schema.optional(Schema.Array(Triple)),
  incoming: Schema.optional(Schema.Array(Schema.Struct({ subject: Schema.String, predicate: Schema.String }))),
  incomingCounts: Schema.optional(Schema.Array(Schema.Struct({ predicate: Schema.String, count: Schema.Number }))),
  hint: Schema.optional(Schema.String),
});
export type DescribeResult = Schema.Schema.Type<typeof DescribeResult>;
