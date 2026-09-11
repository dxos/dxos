//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  submit,
  xmlFormatting,
} from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { type ChatEditorProps } from './ChatEditor.tsx';

// Kept out of `ChatEditor.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const useChatExtensions = ({
  extensions,
  markdown = false,
  lineWrapping = false,
  placeholder,
  onSubmit,
}: ChatEditorProps) => {
  const { themeMode } = useThemeContext();
  return useMemo<Extension[]>(
    () =>
      [
        createThemeExtensions({ themeMode, syntaxHighlighting: markdown }),
        createBasicExtensions({ bracketMatching: false, lineWrapping, placeholder }),
        xmlFormatting(),
        markdown && [createMarkdownExtensions(), decorateMarkdown(), formattingKeymap()],
        // Caller extensions (e.g. `commands()`'s completion-aware Enter binding) must precede
        // `submit()`: both bind Enter at `Prec.highest`, and CodeMirror breaks precedence ties by
        // extension order, so listing `submit()` first would always win and swallow the keystroke.
        extensions,
        submit({ onSubmit }),
      ]
        .flat()
        .filter(isTruthy),
    [themeMode, markdown, lineWrapping, placeholder, extensions, onSubmit],
  );
};
