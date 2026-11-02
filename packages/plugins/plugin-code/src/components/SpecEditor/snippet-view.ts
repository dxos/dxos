//
// Copyright 2026 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';

import { type Snippet } from '@dxos/deus/review';
import { defaultStyles } from '@dxos/ui-editor';

/** The editor's own syntax colours, so a snippet reads like the file it came from. */
const HIGHLIGHT = {
  light: HighlightStyle.define(defaultStyles.light),
  dark: HighlightStyle.define(defaultStyles.dark),
};

const theme = EditorView.theme({
  '&': { fontSize: '12px', background: 'transparent' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)', lineHeight: '1.25rem' },
  '.cm-gutters': { background: 'transparent', border: 'none' },
  '.cm-content': { padding: '0' },
});

/**
 * Renders a snippet into `parent` as a read-only, syntax-highlighted code view numbered from the snippet's first line.
 * The caller destroys the returned view when it removes the element.
 */
export const mountSnippet = (parent: HTMLElement, snippet: Snippet, path: string, dark: boolean): EditorView =>
  new EditorView({
    parent,
    state: EditorState.create({
      doc: [...snippet.lines, ...(snippet.truncated ? ['…'] : [])].join('\n'),
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        lineNumbers({ formatNumber: (number) => String(snippet.line + number - 1) }),
        javascript({ typescript: /\.m?tsx?$/.test(path), jsx: /x$/.test(path) }),
        syntaxHighlighting(dark ? HIGHLIGHT.dark : HIGHLIGHT.light),
        EditorView.darkTheme.of(dark),
        theme,
      ],
    }),
  });
