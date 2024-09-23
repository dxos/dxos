//
// Copyright 2024 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { type VirtualTypeScriptEnvironment } from '@typescript/vfs';
import { tsSync, tsFacet, tsLinter, tsAutocomplete, tsHover } from '@valtown/codemirror-ts';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  editorFullWidth,
  editorGutter,
  editorMonospace,
  InputModeExtensions,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { nonNullable } from '@dxos/util';

export type TypescriptEditorProps = {
  id: string;
  env?: VirtualTypeScriptEnvironment;
  className?: string;
  scrollPastEnd?: boolean;
} & Pick<UseTextEditorProps, 'initialValue' | 'extensions' | 'scrollTo' | 'selection'>;

export const TypescriptEditor = ({
  id,
  extensions,
  env,
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
        extensions,
        createBasicExtensions({
          highlightActiveLine: true,
          indentWithTab: true,
          lineNumbers: true,
          lineWrapping: false,
          scrollPastEnd,
        }),
        createThemeExtensions({
          themeMode,
          syntaxHighlighting: true,
          slots: {
            content: { className: editorFullWidth },
          },
        }),
        editorGutter,
        editorMonospace,
        javascript({ typescript: true }),
        // https://github.com/val-town/codemirror-ts
        env ? [tsFacet.of({ env, path: `/src/${id}.ts` }), tsSync(), tsLinter(), tsHover()] : [],
        autocomplete({ override: env ? [tsAutocomplete()] : [] }),
        InputModeExtensions.vscode,
      ].filter(nonNullable),
      selection,
      scrollTo,
    }),
    [id, initialValue, extensions, themeMode, selection, scrollTo],
  );

  return <div ref={parentRef} className={className} {...focusAttributes} />;
};

export default TypescriptEditor;
