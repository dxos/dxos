//
// Copyright 2023 DXOS.org
//

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { tags } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export const functionRegex = /([A-Za-z0-9]+)\(/;

export const rangeRegex = /[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?/;

const parser = StreamLanguage.define({
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

export const cellExtension: Extension = [parser, syntaxHighlighting(highlightStyles)];
