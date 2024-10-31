//
// Copyright 2023 DXOS.org
//

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { tags } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export const nameRegex = /\{([\w-]+)}/;

const parser = StreamLanguage.define({
  token: (stream) => {
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match(/^#.*/)) {
      return 'lineComment';
    }
    if (stream.match(/^-+$/)) {
      return 'lineComment';
    }
    if (stream.match(nameRegex)) {
      return 'variableName';
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
    tag: tags.variableName,
    class: mx('rounded border border-yellow-500 bg-yellow-100 text-black font-mono text-sm'),
  },
]);

export const promptExtension: Extension = [parser, syntaxHighlighting(highlightStyles)];
