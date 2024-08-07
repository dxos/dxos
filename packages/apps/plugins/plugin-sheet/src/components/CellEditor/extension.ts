//
// Copyright 2023 DXOS.org
//

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { spreadsheet } from 'codemirror-lang-spreadsheet';

import { spreadsheetLanguage } from './parser';
// import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Breaks tests: 'ERR_UNKNOWN_FILE_EXTENSION'
// const x = mx();
console.log(tags, spreadsheetLanguage);

// TODO(burdon): Fork this since the grammar isn't quite right.
// https://github.com/luizzappa/codemirror-lang-spreadsheet
// https://github.com/luizzappa/codemirror-app-spreadsheet/blob/master/src/editor.ts
// https://github.com/dxos/dxos/pull/7375/files#diff-1757aaf8f1b5c00f345c93ff17201f76cf4faad5df53636294c31b2a4a350c4a
// https://github.com/codemirror/lang-example

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
const highlightStyles = HighlightStyle.define([
  //   {
  //     tag: tags.name,
  //     class: mx('text-blue-500'),
  //   },
  //   {
  //     tag: tags.bool,
  //     class: mx('text-green-500'),
  //   },
  //   {
  //     tag: tags.string,
  //     class: mx('text-orange-500'),
  //   },
  //   {
  //     tag: tags.color,
  //     class: mx('mx-[2px] px-1 rounded bg-neutral-200 dark:bg-neutral-500 !text-black font-mono text-sm'),
  //   },
  //   {
  //     tag: tags.invalid,
  //     class: mx('text-red-500'),
  //   },
]);

export type SheetExtensionOptions = {
  functions: string[];
};

const { extension, language } = spreadsheet({
  idiom: 'en-US',
  decimalSeparator: '.',
});

export const sheetExtension = ({ functions }: SheetExtensionOptions): Extension => {
  return [
    syntaxHighlighting(highlightStyles),
    // StateField.define<any>({
    //   create: (state) => {
    //     syntaxTree(state).iterate({
    //       enter: (node) => {
    //         switch (node.type) {
    //           case 'Function':
    //           case 'RangeToken':
    //           default:
    //             console.log(node.type);
    //             break;
    //         }
    //       },
    //     });
    //     return {};
    //   },
    //   update: (_: RangeSet<any>, tr: Transaction) => {},
    // }),
    extension,
    language.data.of({
      autocomplete: (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/\w*/);
        if (!match || match.from === match.to) {
          return null;
        }

        return {
          from: match.from,
          options: functions.filter((name) => name.startsWith(match.text)).map((name) => ({ label: name })),
        };
      },
    }),
    autocompletion({ activateOnTyping: true }),
  ];
};
