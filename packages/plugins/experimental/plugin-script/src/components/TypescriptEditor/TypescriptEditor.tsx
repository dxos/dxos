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
  type EditorInputMode,
  editorMonospace,
  EditorView,
  folding,
  InputModeExtensions,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { nonNullable } from '@dxos/util';

export type TypescriptEditorProps = {
  id: string;
  inputMode: EditorInputMode;
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
  inputMode,
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
        // NOTE: Not using default editor gutter because folding for code works best right beside text.
        EditorView.theme({
          '.cm-gutters': {
            // Match margin from content.
            marginTop: '16px',
          },
        }),
        InputModeExtensions[inputMode],
        folding(),
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
    [id, extensions, themeMode, inputMode, selection, scrollTo],
  );

  return (
    <div ref={parentRef} data-toolbar={toolbar ? 'enabled' : 'disabled'} className={className} {...focusAttributes} />
  );
};

export default TypescriptEditor;
