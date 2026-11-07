//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ContentBlock, type Turn } from '@dxos/test-utils/claude-agent';

/**
 * One MCP tool call the agent made, paired with what came back.
 *
 * Read out of the agent's own stream-json transcript, so an assertion is about a call that really
 * went over the wire with the arguments the model chose — not about a call the eval made on its
 * behalf, which proves nothing about the surface a client meets.
 */
export type Call = {
  /** Tool name as the agent sees it, e.g. `mcp__dx-dev__invokeOperation`. */
  readonly tool: string;
  /** The operation key, for a call through `invokeOperation`; `undefined` for every other tool. */
  readonly operation: string | undefined;
  /**
   * The arguments the handler saw: `input` unwrapped for `invokeOperation`, the whole tool input
   * otherwise. Unwrapped because the operation's own arguments are what a contract is stated in,
   * and leaving them nested makes every assertion reach through a field that is always there.
   */
  readonly input: Record<string, unknown>;
  /** The tool input exactly as the model emitted it, including `key` and `spaceId`. */
  readonly raw: Record<string, unknown>;
  readonly isError: boolean;
  /** The result payload, parsed from the tool result's text. */
  readonly output: Record<string, unknown>;
  /** The result's text, which is the message when `isError`. */
  readonly text: string;
};

/** One row of a `queryObjects` listing, as it comes back without `includeContent`. */
export type Row = { readonly dxn?: string; readonly typename?: string; readonly label?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const stringOf = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The rows of a `queryObjects` result; an empty list for anything that is not one. */
export const rows = (call: Call | undefined): readonly Row[] => {
  const results = call?.output.results;
  return Array.isArray(results)
    ? results
        .filter(isRecord)
        .map((row) => ({ dxn: stringOf(row.dxn), typename: stringOf(row.typename), label: stringOf(row.label) }))
    : [];
};

/** The labels of a listing's rows, which for a task is its title. */
export const labels = (call: Call | undefined): readonly string[] => rows(call).map((row) => row.label ?? '');

/**
 * A tool result's text: the CLI relays an MCP result's content blocks, so the payload arrives as
 * text even though the server sent structured content.
 */
const textOf = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }
  return (Array.isArray(content) ? content : [])
    .map((block) => (isRecord(block) && typeof block.text === 'string' ? block.text : ''))
    .filter((text) => text.length > 0)
    .join('\n');
};

const parse = (text: string): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : {};
  } catch {
    // An error result is a message rather than JSON, and `text` already carries it.
    return {};
  }
};

/** Results arrive as `user` events keyed by the id of the `tool_use` that asked for them. */
const resultsById = (turn: Turn): Map<string, { isError: boolean; text: string }> => {
  const results = new Map<string, { isError: boolean; text: string }>();
  for (const event of turn.events) {
    if (event?.type !== 'user') {
      continue;
    }
    for (const block of event.message?.content ?? []) {
      if (block?.type === 'tool_result' && typeof block.tool_use_id === 'string') {
        results.set(block.tool_use_id, { isError: block.is_error === true, text: textOf(block.content) });
      }
    }
  }
  return results;
};

/** `invokeOperation` stands in front of every projected verb, so the key is what names a call. */
const operationOf = (raw: Record<string, unknown>): string | undefined => stringOf(raw.key);

const inputOf = (raw: Record<string, unknown>): Record<string, unknown> =>
  isRecord(raw.input) ? raw.input : { ...raw };

/**
 * Every MCP tool call of a turn, in order, with its arguments and its result.
 *
 * `Turn.toolCalls` carries names only, which cannot answer either half of what a contract needs:
 * which operation ran behind `invokeOperation`, and what it answered. A run that asserts only the
 * name passes on a call that came back wrong.
 */
export const calls = (turn: Turn, prefix: string): readonly Call[] => {
  const results = resultsById(turn);
  const collected: Call[] = [];
  for (const event of turn.events) {
    if (event?.type !== 'assistant') {
      continue;
    }
    for (const block of (event.message?.content ?? []) as ContentBlock[]) {
      if (block?.type !== 'tool_use' || typeof block.name !== 'string' || !block.name.startsWith(prefix)) {
        continue;
      }
      const raw = isRecord(block.input) ? block.input : {};
      const result = results.get(block.id) ?? { isError: false, text: '' };
      collected.push({
        tool: block.name,
        operation: operationOf(raw),
        input: inputOf(raw),
        raw,
        isError: result.isError,
        output: parse(result.text),
        text: result.text,
      });
    }
  }
  return collected;
};

/**
 * The one call of `operation` whose arguments `matches` accepts, or `undefined`.
 *
 * `undefined` rather than a throw, and undefined is a failing dimension: an agent that was told
 * exactly what to call and called something else has not established the contract, whatever the
 * calls it did make came back as.
 */
export const find = (
  made: readonly Call[],
  operation: string,
  matches: (input: Record<string, unknown>) => boolean,
): Call | undefined => made.find((call) => call.operation === operation && matches(call.input));
