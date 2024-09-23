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
  scrollPastEnd?: boolean;
  env?: VirtualTypeScriptEnvironment;
} & Pick<UseTextEditorProps, 'className' | 'initialValue' | 'extensions' | 'scrollTo' | 'selection'>;

export const TypescriptEditor = ({
  id,
  scrollPastEnd,
  env,
  className,
  initialValue,
  extensions,
  scrollTo,
  selection,
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
        // TODO(burdon): Factor out.
        [
          editorMonospace,
          javascript({ typescript: true }),
          // https://github.com/val-town/codemirror-ts
          autocomplete({ override: env ? [tsAutocomplete()] : [] }),
          env ? [tsFacet.of({ env, path: `/src/${id}.ts` }), tsSync(), tsLinter(), tsHover()] : [],
          InputModeExtensions.vscode,
        ],
      ].filter(nonNullable),
      selection,
      scrollTo,
    }),
    [id, initialValue, extensions, themeMode, selection, scrollTo],
  );

  return <div ref={parentRef} className={className} {...focusAttributes} />;
};

export default TypescriptEditor;
