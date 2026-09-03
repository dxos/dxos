//
// Copyright 2026 DXOS.org
//

import { identity } from './identity.ts';

/**
 * Response passes applied to outgoing JSON-RPC messages.
 *
 * They correct what `McpServer` renders, so they belong to the surface rather than to a host:
 * every host runs them over its own transport (HTTP body, stdio line) or its clients disagree
 * about what this server offers. Each pass mutates the parsed message in place and reports whether
 * it changed anything, so a host can skip re-serializing an untouched message.
 */

/**
 * Server-level usage guidance, sent as `InitializeResult.instructions` — the field the MCP schema
 * defines as "Instructions describing how to use the server and its features … MAY be added to the
 * system prompt". It is the one server text a client loads before any tool is selected (Claude
 * Code injects it at session start and truncates at 2KB), and the MCP guidance reserves it for
 * cross-tool rules that no single tool description can carry
 * (https://blog.modelcontextprotocol.io/posts/2025-11-03-using-server-instructions/).
 *
 * Deliberately fixed and generic: the plugin ecosystem behind this server is open-ended, so
 * per-plugin or per-skill fragments would grow without bound and truncate silently. Plugin- and
 * project-specific guidance lives in skills, and the operations themselves are discovered at
 * runtime — so what is stated here is the *loop* by which a model reaches both.
 */
export const SERVER_INSTRUCTIONS = [
  'This server reads and writes objects in DXOS spaces (collaborative databases). Its verbs are ' +
    'not separate tools: call queryOperations to search them, then invokeOperation to run one.',
  'Before invoking an operation for the first time, call queryOperations with its key to get the ' +
    'input schema, and match it exactly. Rows also carry a mutation class: none reads, write ' +
    'creates or updates, destructive deletes.',
  'Every write targets exactly one space. Pass spaceId explicitly on writes, taking it from the ' +
    "caller's instructions, a repo/project configuration, or a reference already in hand — when " +
    'spaceId is omitted the server falls back to an arbitrary session default, which is not an ' +
    'inferred choice; never guess a space from its name.',
  'References between objects travel as {"/": "echo://<spaceId>/<objectId>"} envelopes. Pass ' +
    'references back exactly as you received them.',
  'Operations belong to larger workflows described by skills. When a queryOperations row names a ' +
    'skill, call loadSkill with that name and follow the returned instructions before invoking ' +
    'the operation; loadSkill with no argument lists every skill. Skills are also offered to ' +
    'users as prompts (slash commands); loadSkill brings the same text into context without user ' +
    'action.',
].join('\n');

/**
 * Ensures every advertised tool declares an object input schema.
 *
 * Effect renders a *parameterless* tool's schema as `{ anyOf: [{type: 'object'}, {type: 'array'}] }`,
 * which carries no top-level `type`. MCP clients validate that field and reject the entire
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

/**
 * Attaches display metadata and server instructions to an `initialize` result.
 *
 * `serverInfo` is an MCP `Implementation`, which the specification allows to carry `title`,
 * `websiteUrl` and `icons`, and the result may carry top-level `instructions` — but
 * `McpServer`'s layers accept only `{ name, version }` and offer no way to supply any of them.
 * Rather than fork the library, the fields are merged into the response on the way out.
 */
export const decorateInitialize = (
  message: unknown,
  options: { readonly serverInfo?: Record<string, unknown>; readonly instructions?: string } = {},
): boolean => {
  const result = resultOf(message);
  if (result?.serverInfo == null) {
    return false;
  }
  // The shared identity goes underneath, so a host adds transport-dependent fields (icon URIs need
  // an origin) without restating — or contradicting — the name and mark every host advertises.
  result.serverInfo = {
    ...(result.serverInfo as Record<string, unknown>),
    title: identity.title,
    websiteUrl: identity.websiteUrl,
    ...(options.serverInfo ?? {}),
  };
  result.instructions ??= options.instructions ?? SERVER_INSTRUCTIONS;
  return true;
};

/** Runs every response pass in order; returns whether the message changed. */
export const normalize = (
  message: unknown,
  options: { readonly serverInfo?: Record<string, unknown>; readonly instructions?: string } = {},
): boolean => {
  const normalized = normalizeToolSchemas(message);
  const decorated = decorateInitialize(message, options);
  return normalized || decorated;
};

const resultOf = (message: unknown): Record<string, any> | undefined => {
  const result = (message as Record<string, any>)?.result;
  return result != null && typeof result === 'object' ? result : undefined;
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
export const normalizeText = (
  text: string,
  options: { readonly serverInfo?: Record<string, unknown>; readonly instructions?: string } = {},
): string | undefined => {
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
