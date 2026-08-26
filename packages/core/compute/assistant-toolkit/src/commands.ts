//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';

import * as Chat from './types/Chat';

/**
 * A deterministic prompt shortcut: a leading `/command args` line runs an operation directly — no
 * model in the loop.
 *
 * The commands themselves live with the operations they invoke (a plugin), not here: this module
 * owns only the shape and the parse, so the prompt editor can list commands and the chat can
 * dispatch one without depending on any particular verb.
 */
export type SlashCommand = {
  /** Including the leading slash, e.g. `/task:run`. */
  command: string;
  /** Description surfaced in the prompt's completion list. */
  description: string;
  /** Runs the command; an Error describes correct usage, and is shown rather than thrown. */
  execute: (args: string, context: SlashCommandContext) => Promise<SlashCommandResult | Error>;
};

/**
 * What a command runs against: the conversation, and the invoker that reaches its operations.
 * `invoke` is the UI's operation invoker, so a command's effect goes through the same verb the
 * agent and the MCP surface call rather than a second implementation of it.
 */
export type SlashCommandContext = {
  db: Database.Database;
  chat: Chat.Chat;
  invoke: OperationInvoke;
};

/** Structurally the app framework's `invokePromise`, so a caller passes it straight through. */
export type OperationInvoke = (operation: any, input: any, options?: any) => Promise<any>;

export type SlashCommandResult = {
  /** One line for the transcript, so a command's effect is visible in the conversation. */
  summary?: string;
  /**
   * Prompt sent to the model after execution. Needed when the effect is driven by the supervisor
   * loop (delegation spawns on the post-turn reconcile), so the command must wake the
   * conversation; omitted when the result is already visible.
   */
  followUp?: string;
};

/** `"1 3"`, `"1,3"`, or titles — numeric tokens become 1-based ordinals. */
export const parseTaskSelectors = (args: string): (number | string)[] =>
  args
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => (/^\d+$/.test(token) ? Number(token) : token));

/**
 * Resolves a prompt into one of `commands`: `undefined` when the text is not a known command (it
 * falls through to the model).
 */
export const resolveSlashCommand = (
  text: string,
  commands: readonly SlashCommand[],
): { command: SlashCommand; args: string } | undefined => {
  if (!text.startsWith('/')) {
    return undefined;
  }
  const [name, ...rest] = text.split(/\s+/);
  const command = commands.find((candidate) => candidate.command === name);
  return command ? { command, args: rest.join(' ') } : undefined;
};
