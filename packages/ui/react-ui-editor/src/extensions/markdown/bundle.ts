//
// Copyright 2023 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  keymap,
  placeholder,
} from '@codemirror/view';

import type { ThemeMode } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { markdownHighlightStyle, markdownTagsExtensions } from './highlight';
import { type TextEditorProps } from '../../components';

export type MarkdownBundleOptions = {
  themeMode?: ThemeMode;
} & Pick<TextEditorProps, 'placeholder' | 'lineWrapping'>;

/**
 * Markdown bundle.
 * Refs:
 * https://codemirror.net/docs/community
 * https://codemirror.net/docs/ref/#codemirror.basicSetup
 */
// TODO(burdon): Add Composer here: https://codemirror.net/docs/community
export const createMarkdownExtensions = ({
  themeMode,
  placeholder: _placeholder,
  lineWrapping = true,
}: MarkdownBundleOptions = {}): Extension[] => {
  return [
    lineWrapping && EditorView.lineWrapping,
    EditorState.allowMultipleSelections.of(true),
    EditorState.tabSize.of(2),

    // https://github.com/codemirror/basic-setup
    bracketMatching(),
    closeBrackets(),
    crosshairCursor(),
    dropCursor(),
    drawSelection(),
    highlightActiveLine(),
    history(),
    indentOnInput(),
    _placeholder && placeholder(_placeholder),

    // Main extension.
    // https://github.com/codemirror/lang-markdown
    // https://codemirror.net/5/mode/markdown/index.html (demo).
    markdown({
      // GRM by default (vs strict CommonMark):
      // Table, TaskList, Strikethrough, and Autolink.
      // NOTE: This extends the parser; it doesn't affect rendering.
      // https://github.github.com/gfm
      // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
      base: markdownLanguage,

      // Languages for syntax highlighting fenced code blocks.
      codeLanguages: languages,

      // Parser extensions.
      extensions: [
        // GFM provided by default.
        markdownTagsExtensions,
      ],
    }),

    // https://github.com/codemirror/theme-one-dark
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),

    // Custom styles.
    syntaxHighlighting(markdownHighlightStyle()),

    keymap.of([
      // https://codemirror.net/docs/ref/#commands.indentWithTab
      indentWithTab,
      // https://codemirror.net/docs/ref/#autocomplete.closeBracketsKeymap
      ...closeBracketsKeymap,
      // https://codemirror.net/docs/ref/#commands.historyKeymap
      ...historyKeymap,
      // https://codemirror.net/docs/ref/#search.searchKeymap
      ...searchKeymap,
      // https://codemirror.net/docs/ref/#commands.standardKeymap
      ...standardKeymap,
    ]),
  ].filter(isNotFalsy);
};
