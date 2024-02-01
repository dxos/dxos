//
// Copyright 2024 DXOS.org
//

import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { tags } from '@dxos/react-ui-editor';
import { mx, tagRoot } from '@dxos/react-ui-theme';

/**
 * https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
 */
const parser = StreamLanguage.define<{ count: number }>({
  startState: () => ({ count: 0 }),
  token: (stream, state) => {
    state.count++;
    if (stream.eatSpace()) {
      return null;
    }
    if (state.count === 1 && stream.match(/^(\/\w+)/)) {
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
    class: mx(tagRoot({}), 'text-base font-medium'),
  },
]);

export const command: Extension = [parser, syntaxHighlighting(styles)];
