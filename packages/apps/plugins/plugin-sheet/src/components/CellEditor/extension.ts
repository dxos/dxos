//
// Copyright 2023 DXOS.org
//

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { spreadsheet } from 'codemirror-lang-spreadsheet';

// import { tags } from '@dxos/react-ui-editor';
// import { mx } from '@dxos/react-ui-theme';

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
const highlightStyles = HighlightStyle.define([
  //   {
  //     tag: tags.macroName,
  //     class: mx('text-blue-500'),
  //   },
  //   {
  //     tag: tags.attributeValue,
  //     class: mx('mx-[2px] px-1 rounded bg-neutral-200 dark:bg-neutral-500 text-black font-mono text-sm'),
  //   },
]);

export type SheetExtensionOptions = {
  functions: string[];
};

const { extension, language } = spreadsheet({});

export const sheetExtension = ({ functions }: SheetExtensionOptions): Extension => {
  return [
    syntaxHighlighting(highlightStyles),
    autocompletion({ activateOnTyping: true }),
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
  ];
};
