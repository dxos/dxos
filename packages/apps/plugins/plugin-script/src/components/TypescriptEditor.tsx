//
// Copyright 2024 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  editorFillLayoutRoot,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

export type TypescriptEditorProps = {
  id: string;
  className?: string;
  scrollPastEnd?: boolean;
} & Pick<UseTextEditorProps, 'initialValue' | 'extensions' | 'scrollTo' | 'selection'>;

export const TypescriptEditor = ({
  id,
  extensions: _extensions,
  initialValue,
  scrollTo,
  selection,
  className,
  scrollPastEnd,
}: TypescriptEditorProps) => {
  const { themeMode } = useThemeContext();

  const extensions = useMemo(
    () =>
      [
        _extensions,
        // TODO(wittjosiah): Highlight active line doesn't work.
        createBasicExtensions({ highlightActiveLine: true, indentWithTab: true, lineNumbers: true, scrollPastEnd }),
        // TODO(wittjosiah): Factor out syntax highlighting to theme extensions.
        themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
        createThemeExtensions({ themeMode, slots: { content: { className: '!px-2' } } }),
        javascript({ typescript: true }),
        autocomplete(),
      ].filter(nonNullable),
    [_extensions, themeMode],
  );

  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id,
      initialValue,
      extensions,
      selection,
      scrollTo,
    }),
    [id, initialValue, extensions, selection, scrollTo],
  );

  return <div ref={parentRef} className={mx(editorFillLayoutRoot, className)} {...focusAttributes} />;
};

export default TypescriptEditor;
