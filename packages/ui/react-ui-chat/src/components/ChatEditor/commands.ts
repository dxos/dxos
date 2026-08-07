//
// Copyright 2026 DXOS.org
//

import {
  type CompletionContext,
  type CompletionResult,
  acceptCompletion,
  autocompletion,
  completionStatus,
} from '@codemirror/autocomplete';
import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';

export type CommandData = { sentinel: string; description?: string };

/** Pure prefix matcher, exported for tests. */
export const matchCommands = (all: CommandData[], token: string): CommandData[] =>
  token.startsWith('$') ? all.filter(({ sentinel }) => sentinel.startsWith(token)) : [];

export type CommandsOptions = { getCommands: () => CommandData[] };

/**
 * Sentinel-command completion: typing `$` offers the commands defined by the bound context's instructions.
 */
export const commands = ({ getCommands }: CommandsOptions): Extension => [
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
  }),
  // The host editor's `submit()` extension also binds Enter at `Prec.highest`; ties between equal
  // precedences break by extension order, so the caller must place this extension ahead of `submit()`.
  // `completionStatus`/`acceptCompletion` are imported from the same module as `autocompletion()` above
  // (not re-derived in a different package) so this always reads the completion state `autocompletion()`
  // actually wrote — a cross-package import of the same-named API can resolve to a distinct bundled
  // copy of `@codemirror/autocomplete` under some bundler configurations, silently reading `null`.
  Prec.highest(
    keymap.of([
      {
        key: 'Enter',
        run: (view) => (completionStatus(view.state) === 'active' ? acceptCompletion(view) : false),
      },
    ]),
  ),
];
