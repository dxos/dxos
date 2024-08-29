//
// Copyright 2024 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
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

  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id,
      initialValue,
      extensions: [
        _extensions,
        // TODO(wittjosiah): Highlight active line doesn't work.
        createBasicExtensions({ highlightActiveLine: true, indentWithTab: true, lineNumbers: true, scrollPastEnd }),
        // TODO(wittjosiah): Factor out syntax highlighting to theme extensions.
        themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
        createThemeExtensions({ themeMode, slots: { editor: {} } }),
        javascript({ typescript: true }),
        autocomplete(),
      ].filter(nonNullable),
      selection,
      scrollTo,
    }),
    [id, initialValue, _extensions, themeMode, selection, scrollTo],
  );

  return <div ref={parentRef} className={className} {...focusAttributes} />;
};

export default TypescriptEditor;
