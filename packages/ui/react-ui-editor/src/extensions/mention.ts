//
// Copyright 2023 DXOS.org
//

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';

export type MentionOptions = {
  onSearch: (text: string) => string[];
};

// TODO(burdon): Can only have a single autocompletion. Merge configuration with autocomplete.
export const mention = ({ onSearch }: MentionOptions): Extension => {
  return autocompletion({
    activateOnTyping: true,
    selectOnOpen: true,
    closeOnBlur: true, // For debugging.
    // defaultKeymap: false,
    icons: false,
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/@(\w+)?/);
        if (!match || (match.from === match.to && !context.explicit)) {
          return null;
        }

        console.log(match);

        return {
          from: match.from,
          options: onSearch(match.text.slice(1).toLowerCase()).map((value) => ({ label: `@${value}` })),
        };
      },
    ],
  });
};
