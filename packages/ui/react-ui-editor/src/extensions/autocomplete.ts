//
// Copyright 2023 DXOS.org
//

// https://codemirror.net/examples/autocompletion
// https://codemirror.net/docs/ref/#autocomplete.autocompletion
// https://codemirror.net/docs/ref/#autocomplete.Completion

import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

export type AutocompleteResult = Completion;

export type AutocompleteOptions = {
  onSearch: (text: string) => Completion[];
};

/**
 * Autocomplete extension.
 */
export const autocomplete = ({ onSearch }: AutocompleteOptions) => {
  return [
    // https://codemirror.net/docs/ref/#view.keymap
    // https://discuss.codemirror.net/t/how-can-i-replace-the-default-autocompletion-keymap-v6/3322
    keymap.of(completionKeymap),

    // https://codemirror.net/examples/autocompletion
    // https://codemirror.net/docs/ref/#autocomplete.autocompletion
    autocompletion({
      // TODO(burdon): Set custom keymap.
      // defaultKeymap: false,

      // Don't start unless key press.
      activateOnTyping: false,

      // TODO(burdon): Option to create new page?
      // TODO(burdon): Optional decoration via addToOptions
      override: [
        (context: CompletionContext): CompletionResult | null => {
          const match = context.matchBefore(/\w*/);
          if (!match || (match.from === match.to && !context.explicit)) {
            return null;
          }

          return {
            from: match.from,
            options: onSearch(match.text.toLowerCase()),
          };
        },
      ],
    }),
  ];
};
