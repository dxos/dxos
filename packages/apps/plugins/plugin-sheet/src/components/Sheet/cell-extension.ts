//
// Copyright 2023 DXOS.org
//

import { HighlightStyle, LRLanguage, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { Grammar, parser } from '@lezer/lezer';

import { tags } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export const functionRegex = /([A-Za-z0-9]+)\(/;

export const rangeRegex = /[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?/;

// TODO(burdon): Use HF parser?
const parser2 = StreamLanguage.define({
  token: (stream) => {
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match(functionRegex)) {
      stream.backUp(1);
      return 'macroName';
    }
    if (stream.match(rangeRegex)) {
      return 'attributeValue';
    }
    stream.next();
    return null;
  },
});

/**
 * https://codemirror.net/examples/lang-package
 */
export const formulaLanguage = LRLanguage.define({
  parser: parser.configure(new Grammar({})),
  languageData: {},
});

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
const highlightStyles = HighlightStyle.define([
  {
    tag: tags.macroName,
    class: mx('text-blue-500'),
  },
  {
    tag: tags.attributeValue,
    class: mx('mx-[2px] px-1 rounded bg-neutral-200 dark:bg-neutral-500 text-black font-mono text-sm'),
  },
]);

export type CellExtensionOptions = {
  onMatch?: (value: string) => string[];
};

export const createCellExtension = ({ onMatch }: CellExtensionOptions): Extension => [
  syntaxHighlighting(highlightStyles),
  // parser,
  formulaLanguage.data.of({
    autocompletion: (context) => {
      console.log('###', context);
    },
  }),
  // onMatch
  //   ? autocompletion({
  //       activateOnTyping: true,
  //     })
  //   : [],
];

// o: (text) => {
//   return onMatch(text).map((value) => ({ label: value }));
// },
