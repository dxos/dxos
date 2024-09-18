//
// Copyright 2023 DXOS.org
//

// https://codemirror.net/examples/autocompletion
// https://codemirror.net/docs/ref/#autocomplete.autocompletion
// https://codemirror.net/docs/ref/#autocomplete.Completion

import {
  autocompletion,
  completionKeymap,
  type CompletionSource,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';

export type AutocompleteResult = Completion;

export type AutocompleteOptions = {
  activateOnTyping?: boolean;
  override?: CompletionSource[];
  onSearch?: (text: string) => Completion[];
};

/**
 * Autocomplete extension.
 */
export const autocomplete = ({ activateOnTyping, override, onSearch }: AutocompleteOptions = {}) => {
  const extentions = [
    // https://codemirror.net/docs/ref/#view.keymap
    // https://discuss.codemirror.net/t/how-can-i-replace-the-default-autocompletion-keymap-v6/3322
    // TODO(burdon): Set custom keymap.
    keymap.of(completionKeymap),

    // https://codemirror.net/examples/autocompletion
    // https://codemirror.net/docs/ref/#autocomplete.autocompletion
    autocompletion({
      activateOnTyping,
      override,

      // closeOnBlur: false,
      // defaultKeymap: false,

      // TODO(burdon): Styles/fragments.
      tooltipClass: () => 'shadow rounded',
    }),
  ];

  if (onSearch) {
    extentions.push(
      // TODO(burdon): Optional decoration via addToOptions
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

  return extentions;
};
