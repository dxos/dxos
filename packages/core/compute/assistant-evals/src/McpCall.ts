//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * What one MCP tool call came back as.
 *
 * `isError` is the tool's own flag, not a thrown transport failure: a handler that refuses a call
 * answers 200 with that flag set, and telling a refusal apart from an answer is the whole subject
 * of a contract scorer.
 */
export type Outcome = {
  readonly isError: boolean;
  /** The tool's structured payload — for `invokeOperation`, the operation's output verbatim. */
  readonly structured: Record<string, unknown>;
  /** Every text block joined; the message when `isError`. */
  readonly text: string;
};

/** One row of a `queryObjects` listing, as it comes back without `includeContent`. */
export type Row = { readonly dxn?: string; readonly typename?: string; readonly label?: string };

export type Session = {
  /** Calls one of the server's tools by name. */
  readonly call: (tool: string, args?: Record<string, unknown>) => Promise<Outcome>;
  /** Runs one operation by key, which is how every projected verb is reached. */
  readonly invoke: (key: string, input: Record<string, unknown>, spaceId?: string) => Promise<Outcome>;
  readonly close: () => Promise<void>;
};

export type OpenOptions = {
  readonly url: string;
  readonly headers?: Record<string, string>;
};

/** The wire form a reference argument travels as, which is what the server decodes against a schema. */
export const ref = (spaceId: string, objectId: string): Record<string, string> => ({
  '/': `echo://${spaceId}/${objectId}`,
});

/** A JSON object, which is what every payload read here is; anything else is read as absent. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const stringOf = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The rows of a `queryObjects` result; an empty list for anything that is not one. */
export const rows = (outcome: Outcome): readonly Row[] => {
  const results = outcome.structured.results;
  return Array.isArray(results)
    ? results
        .filter(isRecord)
        .map((row) => ({ dxn: stringOf(row.dxn), typename: stringOf(row.typename), label: stringOf(row.label) }))
    : [];
};

/** Every text block of a result joined; the message when the call was refused. */
const textOf = (content: unknown): string =>
  (Array.isArray(content) ? content : [])
    .map((block) => (isRecord(block) && typeof block.text === 'string' ? block.text : ''))
    .filter((text) => text.length > 0)
    .join('\n');

/**
 * The payload, preferring the typed channel.
 *
 * The text block is the fallback rather than the source: it is the same object serialized, and a
 * result carrying only structured content would otherwise read as empty. An error result's content
 * is a message rather than JSON, which `text` already carries.
 */
const payloadOf = (structured: unknown, text: string): Record<string, unknown> => {
  if (isRecord(structured)) {
    return structured;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Calls the MCP surface directly, over the same Streamable HTTP transport an agent's client uses.
 *
 * Separate from {@link McpLatency}, which times calls and records nothing about what came back: a
 * contract — that a filter narrows, that a refusal is a refusal, that a capped page says so — is
 * about the payload, and a scenario driven through a model cannot establish one. The agent picks
 * its own arguments, so a call that was never made and a call that came back wrong are the same
 * green run.
 *
 * One connection for the whole scenario, so a sequence of calls is one session as a client's is.
 */
export const open = async ({ url, headers }: OpenOptions): Promise<Session> => {
  const client = new Client({ name: 'dx-eval-contract', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: headers ? { headers } : undefined,
  });
  await client.connect(transport);

  const call = async (tool: string, args: Record<string, unknown> = {}): Promise<Outcome> => {
    try {
      // Read field by field rather than through the SDK's result type: `callTool` is typed as a
      // union whose other arm carries no content at all, and only the fields below are read here.
      const result: unknown = await client.callTool({ name: tool, arguments: args });
      const fields = isRecord(result) ? result : {};
      const text = textOf(fields.content);
      return { isError: fields.isError === true, structured: payloadOf(fields.structuredContent, text), text };
    } catch (error) {
      // A transport failure is an outcome too: scorers run after this, and a thrown call here would
      // take every other dimension of the run with it instead of failing the one it belongs to.
      return { isError: true, structured: {}, text: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    call,
    invoke: (key, input, spaceId) => call('invokeOperation', { key, input, ...(spaceId ? { spaceId } : {}) }),
    close: () => client.close().catch(() => {}),
  };
};
