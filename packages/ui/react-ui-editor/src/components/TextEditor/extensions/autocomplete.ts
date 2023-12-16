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

//
// Copyright 2023 DXOS.org
//

import {
  autocompletion,
  type CompletionContext,
  completionKeymap,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

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

// TODO(burdon): Hint to customize?
// https://codemirror.net/examples/autocompletion

export const autocomplete = () => [
  keymap.of(completionKeymap),
  autocompletion({
    // addToOptions: [
    //   {
    //     render: (completion) => {
    //       const el = document.createElement('div');
    //       el.innerText = 'info';
    //       return el;
    //     },
    //     position: 0,
    //   },
    // ],
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        return {
          from: word.from,
          options: [
            { label: 'apple', type: 'keyword' },
            { label: 'amazon', type: 'keyword' },
            { label: 'hello', type: 'variable', info: '(World)' },
            { label: 'magic', type: 'text', apply: '⠁⭒*.✩.*⭒⠁', detail: 'macro' },
          ],
        };
      },
    ],
  }),
];
