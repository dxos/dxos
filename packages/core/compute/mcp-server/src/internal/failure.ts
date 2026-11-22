//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

const TOOL_FAILURE_CODES = ['invalid_request', 'space_not_in_context', 'operation_failed', 'skill_not_loaded'] as const;

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

/**
 * Codes that blame the call rather than the server: a malformed input, an unknown key, a skill not
 * yet loaded, a space outside the session. The caller can correct each from the message alone.
 */
const CALLER_FAULT_CODES: ReadonlySet<ToolFailureCode> = new Set([
  'invalid_request',
  'space_not_in_context',
  'skill_not_loaded',
]);

export const isCallerFault = (code: ToolFailureCode): boolean => CALLER_FAULT_CODES.has(code);

/**
 * Recovers the code and message from a failure's text, the only form that crosses the wire: a
 * process watching the transport (e.g. analytics) has the `isError` result's text and nothing else.
 */
export const parseFailure = (text: string): { code: ToolFailureCode; message: string } | undefined => {
  const separator = text.indexOf(': ');
  const code = TOOL_FAILURE_CODES.find((candidate) => candidate === text.slice(0, separator));
  return separator < 0 || code === undefined ? undefined : { code, message: text.slice(separator + 2) };
};
