//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Automcomplete: https://codemirror.net/5/doc/manual.html#addon_runmode
// TODO(burdon): Modes: parallel parsing and decoration (e.g., associated with language).
// TODO(burdon): Add-on: runmode: run lexer over content (with rendering codemirror).
//  https://codemirror.net/5/doc/manual.html#addon_runmode
// TODO(burdon): Add-on: dialog.
// TODO(burdon): Comments: https://codemirror.net/5/doc/manual.html#setBookmark
// TODO(burdon): Split view: https://codemirror.net/examples/split

// https://codemirror.net/examples/autocompletion
// https://codemirror.net/docs/ref/#autocomplete.autocompletion
// https://codemirror.net/docs/ref/#autocomplete.Completion

import {
  autocompletion,
  type Completion,
  type CompletionContext,
  completionKeymap,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

export type AutocompleteOptions = {
  getOptions: (text: string) => Completion[];
};

/**
 * Autocomplete extension.
 */
export const autocomplete = ({ getOptions }: AutocompleteOptions) => [
  // https://codemirror.net/docs/ref/#view.keymap
  // https://discuss.codemirror.net/t/how-can-i-replace-the-default-autocompletion-keymap-v6/3322
  keymap.of(completionKeymap),

  // https://codemirror.net/examples/autocompletion
  // https://codemirror.net/docs/ref/#autocomplete.autocompletion
  autocompletion({
    // TODO(burdon): Set custom keymap.
    // defaultKeymap: false,

    // TODO(burdon): Option to create new page?
    // TODO(burdon): Optional decoration via addToOptions
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        // TODO(burdon): Option to convert to links?
        return {
          from: word.from,
          options: getOptions(word.text),
          // options: [
          //   { label: 'apple', type: 'keyword' },
          //   { label: 'amazon', type: 'keyword' },
          //   { label: 'hello', type: 'variable', info: '(World)' },
          //   { label: 'magic', type: 'text', apply: '⠁⭒*.✩.*⭒⠁', detail: 'macro' },
          // ],
        };
      },
    ],
  }),
];
