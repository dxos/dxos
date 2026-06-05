//
// Copyright 2024 DXOS.org
//

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { tags } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

/**
 * Highlights leading slash-commands (e.g. `/resolve`) and `@mention` tags
 * (e.g. `@Kai`, anywhere) in the message composer.
 * https://github.com/codemirror/stream-parser/blob/main/test/test-stream-parser.ts
 */
const parser = StreamLanguage.define<{ count: number }>({
  startState: () => ({ count: 0 }),
  token: (stream, state) => {
    state.count++;
    if (stream.eatSpace()) {
      return null;
    }
    // Leading slash-command (first token only).
    if (state.count === 1 && stream.match(/^\/\w+/)) {
      return 'tagName';
    }
    // @mention (anywhere).
    if (stream.match(/^@\w+/)) {
      return 'labelName';
    }
    stream.next();
    return null;
  },
});

const styles = HighlightStyle.define([
  {
    tag: tags.tagName,
    class: mx('dx-tag dx-tag--indigo text-base-fg font-medium'),
  },
  {
    tag: tags.labelName,
    class: mx('dx-tag dx-tag--blue text-base-fg font-medium'),
  },
]);

export const command: Extension = [parser, syntaxHighlighting(styles)];
