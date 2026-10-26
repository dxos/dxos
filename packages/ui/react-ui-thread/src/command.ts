//
// Copyright 2024 DXOS.org
//

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { mentionPills, tags } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type Mention } from './types.ts';

/**
 * Highlights leading slash-commands (e.g. `/resolve`) in the message composer; `@mention`s render as atomic pills
 * ({@link mentionPills}).
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
    stream.next();
    return null;
  },
});

const styles = HighlightStyle.define([
  {
    tag: tags.tagName,
    class: mx('dx-tag dx-tag-inline dx-tag-indigo mx-0.5'),
  },
]);

// Center the inline `.dx-tag` pills on the text line. An inline tag is an inline box
// with vertical padding, so on a CodeMirror line it baseline-aligns and rides
// high; overriding `vertical-align` recentres it (cf. the `cm-reference-pill`
// precedent in `@dxos/react-ui-chat`).
const theme = EditorView.theme({
  '.dx-tag': {
    verticalAlign: 'bottom',
  },
});

export const command = ({ mentions }: { mentions?: readonly Mention[] } = {}): Extension => [
  parser,
  syntaxHighlighting(styles),
  mentionPills({
    names: mentions?.map(({ name }) => name),
    hue: (name) => mentions?.find((mention) => mention.name.toLowerCase() === name.toLowerCase())?.hue,
  }),
  theme,
];
