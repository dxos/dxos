//
// Copyright 2023 DXOS.org
//

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { spreadsheet } from 'codemirror-lang-spreadsheet';

import { mx } from '@dxos/react-ui-theme';

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
const highlightStyles = HighlightStyle.define([
  // Function.
  {
    tag: tags.name,
    class: mx('text-blue-500'),
  },
  // Range.
  {
    tag: tags.color,
    class: mx('text-orange-500'),
  },
  // Values.
  {
    tag: tags.integer,
    class: mx('text-green-500'),
  },
  {
    tag: tags.bool,
    class: mx('text-green-500'),
  },
  {
    tag: tags.string,
    class: mx('text-green-500'),
  },
  // Error.
  {
    tag: tags.invalid,
    class: mx('text-red-500'),
  },
]);

export type SheetExtensionOptions = {
  functions: string[];
};

/**
 * Spreadsheet formula extension and parser.
 * https://github.com/luizzappa/codemirror-lang-spreadsheet
 * https://github.com/luizzappa/codemirror-app-spreadsheet/blob/master/src/editor.ts
 * https://github.com/codemirror/lang-example
 * https://hyperformula.handsontable.com/guide/key-concepts.html#grammar
 */
export const sheetExtension = ({ functions }: SheetExtensionOptions): Extension => {
  const { extension, language } = spreadsheet({ idiom: 'en-US', decimalSeparator: '.' });

  return [
    // debugTokenLogger(),
    syntaxHighlighting(highlightStyles),
    extension,
    language.data.of({
      autocomplete: (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/\w*/);
        if (!match || match.from === match.to) {
          return null;
        }

        const text = match.text.toUpperCase();
        if (!context.explicit && match.text.length < 2) {
          return null;
        }

        return {
          from: match.from,
          options: functions.filter((name) => name.startsWith(text)).map((name) => ({ label: name })),
        };
      },
    }),
    autocompletion({ activateOnTyping: true, closeOnBlur: false }),
  ];
};
