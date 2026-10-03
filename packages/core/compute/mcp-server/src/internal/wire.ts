//
// Copyright 2026 DXOS.org
//

import { decorateInitializeResult } from './legacy-initialize-result.ts';
import {
  type PassOptions,
  type ResponsePass,
  SERVER_INSTRUCTIONS,
  isRecord,
  resultOf,
  withIdentity,
} from './response-pass.ts';

/**
 * Response passes applied to outgoing JSON-RPC messages.
 *
 * They correct what `McpServer` renders, so they belong to the surface rather than to a host:
 * every host runs them over its own transport (HTTP body, stdio line) or its clients disagree
 * about what this server offers. Each pass mutates the parsed message in place and reports whether
 * it changed anything, so a host can skip re-serializing an untouched message.
 */

/**
 * Ensures every advertised tool declares an object input schema.
 *
 * Effect renders a *parameterless* tool's schema as `{ not: { type: 'null' } }` -- the bare `object`
 * keyword -- which carries no top-level `type`. MCP clients validate that field and reject the entire
 * `tools/list` response over it — "expected object" at `tools[N].inputSchema.type` — so a single
 * parameterless tool takes every other tool down with it and the server appears to expose nothing.
 *
 * Only the empty case is rewritten: a schema that already declares `type: 'object'`, or that
 * carries `properties`, is left exactly as it is.
 */
export const normalizeToolSchemas = (message: unknown): boolean => {
  let rewritten = false;
  for (const tool of toolsOf(message)) {
    const schema = tool?.inputSchema;
    if (schema != null && schema.type !== 'object' && schema.properties == null) {
      tool.inputSchema = { type: 'object', properties: {}, additionalProperties: false };
      rewritten = true;
    }
  }
  return rewritten;
};

/** Where a result names the server. */
const SERVER_INFO_META = 'io.modelcontextprotocol/serverInfo';

/**
 * Attaches display metadata to the server a result names, and server instructions to a
 * `server/discover` result.
 *
 * The server is an MCP `Implementation`, which the specification allows to carry `title`,
 * `websiteUrl` and `icons`, and the discover result may carry top-level `instructions` — but
 * `McpServer`'s layers accept only `{ name, version }` and offer no way to supply any of them.
 * Rather than fork the library, the fields are merged into the response on the way out.
 */
export const decorateServerInfo: ResponsePass = (message, options) => {
  const result = resultOf(message);
  const meta: unknown = result?._meta;
  const serverInfo: unknown = isRecord(meta) ? meta[SERVER_INFO_META] : undefined;
  if (result == null || !isRecord(meta) || !isRecord(serverInfo)) {
    return false;
  }
  meta[SERVER_INFO_META] = withIdentity(serverInfo, options);
  if (Array.isArray(result.supportedVersions)) {
    result.instructions ??= options.instructions ?? SERVER_INSTRUCTIONS;
  }
  return true;
};

const passes: ResponsePass[] = [
  normalizeToolSchemas,
  decorateServerInfo,
  // TODO(wittjosiah): Remove when every DXOS MCP server drops 2025-era MCP support.
  decorateInitializeResult,
];

/** Runs every response pass in order; returns whether the message changed. */
export const normalize = (message: unknown, options: PassOptions = {}): boolean => {
  let changed = false;
  for (const pass of passes) {
    changed = pass(message, options) || changed;
  }
  return changed;
};

const toolsOf = (message: unknown): Array<Record<string, any>> => {
  const tools = resultOf(message)?.tools;
  return Array.isArray(tools) ? tools : [];
};

const decoder = new TextDecoder();

/**
 * Normalizes one NDJSON line, returning the original chunk when nothing changed so an untouched
 * message is never re-serialized. A batch arrives as an array, each element a message in its own
 * right.
 */
export const normalizeLine = (chunk: string | Uint8Array): string | Uint8Array => {
  const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk);
  const normalized = normalizeText(text);
  return normalized == null ? chunk : `${normalized}\n`;
};

/** Normalizes a JSON-RPC payload, returning `undefined` when it is unrecognized or unchanged. */
export const normalizeText = (text: string, options: PassOptions = {}): string | undefined => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined;
  }
  try {
    const message = JSON.parse(trimmed);
    const changed = Array.isArray(message)
      ? message.map((entry) => normalize(entry, options)).some(Boolean)
      : normalize(message, options);
    return changed ? JSON.stringify(message) : undefined;
  } catch {
    // Not a message we recognise; the caller passes the original through rather than corrupting it.
    return undefined;
  }
};
