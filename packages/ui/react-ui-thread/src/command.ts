//
// Copyright 2024 DXOS.org
//

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

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
    class: mx('dx-tag dx-tag--indigo'),
  },
  {
    tag: tags.labelName,
    class: mx('dx-tag dx-tag--blue'),
  },
]);

// Center the inline `.dx-tag` pills on the text line. `.dx-tag` is `inline-block`
// with vertical padding, so on a CodeMirror line it baseline-aligns and rides
// high; overriding `vertical-align` recentres it (cf. the `cm-reference-pill`
// precedent in `@dxos/react-ui-chat`).
const theme = EditorView.theme({
  '.dx-tag': {
    verticalAlign: 'bottom',
  },
});

export const command: Extension = [parser, syntaxHighlighting(styles), theme];
