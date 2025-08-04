//
// Copyright 2023 DXOS.org
//

import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';

export type AutocompleteResult = Completion;

export type AutocompleteOptions = {
  activateOnTyping?: boolean;
  override?: CompletionSource[];
  onSearch?: (text: string) => Completion[];
};

// https://codemirror.net/examples/autocompletion
// https://codemirror.net/docs/ref/#autocomplete.autocompletion
// https://codemirror.net/docs/ref/#autocomplete.Completion

/**
 * Autocomplete extension.
 */
export const autocomplete = ({ activateOnTyping, override, onSearch }: AutocompleteOptions = {}): Extension => {
  const extensions: Extension[] = [
    // https://codemirror.net/docs/ref/#view.keymap
    // https://discuss.codemirror.net/t/how-can-i-replace-the-default-autocompletion-keymap-v6/3322
    // TODO(burdon): Set custom keymap.
    keymap.of(completionKeymap),

    // https://codemirror.net/examples/autocompletion
    // https://codemirror.net/docs/ref/#autocomplete.autocompletion
    autocompletion({
      override,
      activateOnTyping,
      // closeOnBlur: false,
      // tooltipClass: () => 'rounded-be pbe-1 border-separator',
    }),
  ];

  if (onSearch) {
    extensions.push(
      // TODO(burdon): Optional decoration via addToOptions.
      markdownLanguage.data.of({
        autocomplete: (context: CompletionContext): CompletionResult | null => {
          const match = context.matchBefore(/\w*/);
          if (!match || (match.from === match.to && !context.explicit)) {
            return null;
          }

          return {
            from: match.from,
            options: onSearch(match.text.toLowerCase()),
          };
        },
      }),
    );
  }

  return extensions;
};
