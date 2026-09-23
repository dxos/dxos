//
// Copyright 2026 DXOS.org
//

import { identity } from './identity.ts';

/**
 * Server-level usage guidance, sent as the result's `instructions` — the field the MCP schema
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

export type PassOptions = {
  readonly serverInfo?: Record<string, unknown>;
  readonly instructions?: string;
};

/** Mutates the message in place; reports whether it changed. */
export type ResponsePass = (message: unknown, options: PassOptions) => boolean;

/** Shared identity underneath, so a host adds origin-dependent fields without restating the name. */
export const withIdentity = (serverInfo: Record<string, unknown>, options: PassOptions): Record<string, unknown> => ({
  ...serverInfo,
  title: identity.title,
  websiteUrl: identity.websiteUrl,
  ...(options.serverInfo ?? {}),
});

export const isRecord = (value: unknown): value is Record<string, any> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

export const resultOf = (message: unknown): Record<string, any> | undefined => {
  const result = isRecord(message) ? message.result : undefined;
  return result != null && typeof result === 'object' ? result : undefined;
};
