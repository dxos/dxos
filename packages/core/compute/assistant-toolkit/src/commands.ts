//
// Copyright 2026 DXOS.org
//

import { type AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { type Database } from '@dxos/echo';

/**
 * A deterministic prompt shortcut: a leading `/command args` line runs an operation directly, with
 * no model in the loop. The commands live with the verbs they invoke, so this module stays
 * operation-agnostic - the parse and the shape are all a prompt editor or a chat needs.
 */
export type SlashCommand = {
  /** Including the leading slash, e.g. `/task:run`. */
  command: string;
  /** Description surfaced in the prompt's completion list. */
  description: string;
  /** Changes only the chat object itself, so it runs on a chat not yet stored (a companion's) and leaves it unstored. */
  chatOnly?: boolean;
  /** Runs the command; an Error describes correct usage, and is shown rather than thrown. */
  execute: (args: string, context: SlashCommandContext) => Promise<SlashCommandResult | Error>;
};

/** `invoke` is the caller's own invoker, so a command's effect goes through the verb itself. */
export type SlashCommandContext = {
  db: Database.Database;
  chat: Chat.Chat;
  invoke: OperationInvoke;
  /** The conversation's bindings, for a command that changes what is in context (e.g. loading a skill). */
  binder?: AiContext.Binder;
};

/** `OperationService['invokePromise']`, so the operation's input and output types survive the call. */
export type OperationInvoke = Operation.OperationService['invokePromise'];

export type SlashCommandResult = {
  /** One line for the transcript, so a command's effect is visible in the conversation. */
  summary?: string;
  /**
   * Prompt sent to the model after execution. Needed when the effect is driven by the supervisor
   * loop (delegation spawns on the post-turn reconcile), so the command must wake the
   * conversation; omitted when the result is already visible.
   */
  followUp?: string;
  /**
   * The reader's own message, sent after the command the way a typed prompt is: queued behind a
   * running turn, its mentions bound (e.g. the text after a skill command).
   */
  prompt?: string;
};

/** A task named by its 1-based position in the set, or by its exact title. */
export type TaskSelector = { ordinal: number } | { title: string };

/**
 * `1 3`, `1,3`, or titles. Quoting is what makes a title unambiguous - a title is often several
 * words (`"Draft release notes"`) and may itself be a number (`"123"`), neither of which a bare
 * whitespace split can express.
 */
export const parseTaskSelectors = (args: string): TaskSelector[] => {
  const selectors: TaskSelector[] = [];
  // Quoted run, or a bare run of anything but whitespace and commas.
  const tokens = args.matchAll(/"([^"]*)"|'([^']*)'|([^\s,]+)/g);
  for (const [, doubleQuoted, singleQuoted, bare] of tokens) {
    const quoted = doubleQuoted ?? singleQuoted;
    if (quoted !== undefined) {
      if (quoted.length > 0) {
        selectors.push({ title: quoted });
      }
    } else if (bare !== undefined) {
      selectors.push(/^\d+$/.test(bare) ? { ordinal: Number(bare) } : { title: bare });
    }
  }
  return selectors;
};

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
  const [name] = text.split(/\s/, 1);
  const command = commands.find((candidate) => candidate.command === name);
  return command ? { command, args: text.slice(name.length).trim() } : undefined;
};
