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
  toolbar?: boolean;
} & Pick<UseTextEditorProps, 'className' | 'initialValue' | 'extensions' | 'scrollTo' | 'selection'>;

export const TypescriptEditor = ({
  id,
  env,
  className,
  initialValue,
  extensions,
  scrollTo,
  selection,
  toolbar,
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
          scrollPastEnd: true,
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
    [id, extensions, themeMode, selection, scrollTo],
  );

  return (
    <div ref={parentRef} data-toolbar={toolbar ? 'enabled' : 'disabled'} className={className} {...focusAttributes} />
  );
};

export default TypescriptEditor;
