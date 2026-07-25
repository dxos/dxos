//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';

export type CommandData = { sentinel: string; description?: string };

/** Pure prefix matcher, exported for tests. */
export const matchCommands = (all: CommandData[], token: string): CommandData[] =>
  token.startsWith('$') ? all.filter(({ sentinel }) => sentinel.startsWith(token)) : [];

export type CommandsOptions = { getCommands: () => CommandData[] };

/**
 * Sentinel-command completion: typing `$` offers the commands defined by the bound context's instructions.
 */
export const commands = ({ getCommands }: CommandsOptions): Extension =>
  autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\$[\w-]*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }
        const options = matchCommands(getCommands(), context.state.sliceDoc(word.from, word.to));
        if (options.length === 0) {
          return null;
        }
        return {
          from: word.from,
          options: options.map(({ sentinel, description }) => ({ label: sentinel, detail: description })),
        };
      },
    ],
  });
