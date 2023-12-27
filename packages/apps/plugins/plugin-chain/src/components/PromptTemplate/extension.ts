//
// Copyright 2023 DXOS.org
//

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { tags } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export const nameRegex = /\{([\w_]+)}/;

/**
 * https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
 */
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
      return 'tagName';
    }
    stream.next();
    return null;
  },
});

/**
 * https://codemirror.net/examples/styling
 * https://lezer.codemirror.net/docs/ref/#highlight
 */
const styles = HighlightStyle.define([
  {
    tag: tags.tagName,
    class: mx('py-1 bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white font-mono text-sm'),
  },
]);

export const promptExtension: Extension = [parser, syntaxHighlighting(styles)];
