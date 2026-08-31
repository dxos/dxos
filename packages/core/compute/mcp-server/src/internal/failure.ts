//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

const TOOL_FAILURE_CODES = ['invalid_request', 'space_not_in_context', 'operation_failed'] as const;

export type ToolFailureCode = (typeof TOOL_FAILURE_CODES)[number];

/**
 * Typed tool failure, declared as each tool's `failure` schema so `McpServer` returns an `isError`
 * result with a readable message rather than letting a defect escape as an opaque JSON-RPC `Die`
 * envelope a model cannot act on.
 *
 * An `Error` subclass rather than a plain struct because `McpServer` only forwards a declared
 * failure's text when it is one. `structuredContent` is populated on success only, so the
 * machine-readable `code` rides the message.
 */
export class ToolFailure extends Schema.TaggedError<ToolFailure>('ToolFailure')('ToolFailure', {
  code: Schema.Literals(TOOL_FAILURE_CODES).annotate({ description: 'Machine-readable failure category.' }),
  message: Schema.String.annotate({ description: 'Human-readable explanation.' }),
}) {}

export const failure = (code: ToolFailureCode, message: string): ToolFailure =>
  new ToolFailure({ code, message: `${code}: ${message}` });
