//
// Copyright 2023 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';

import { log } from '@dxos/log';

export type MentionOptions = {
  debug?: boolean;
  onSearch: (text: string) => string[];
};

// TODO(burdon): Can only have a single autocompletion. Merge configuration with autocomplete.
export const mention = ({ debug, onSearch }: MentionOptions): Extension =>
  autocompletion({
    // TODO(burdon): Not working.
    activateOnTyping: true,
    // activateOnTypingDelay: 100,
    // selectOnOpen: true,
    closeOnBlur: !debug,
    // defaultKeymap: false,
    icons: false,
    override: [
      (context: CompletionContext): CompletionResult | null => {
        log.info('completion context', { context });

        const match = context.matchBefore(/@(\w+)?/);
        if (!match || (match.from === match.to && !context.explicit)) {
          return null;
        }

        return {
          from: match.from,
          options: onSearch(match.text.slice(1).toLowerCase()).map((value) => ({ label: `@${value}` })),
        };
      },
    ],
  });
