//
// Copyright 2024 DXOS.org
//

import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { type VirtualTypeScriptEnvironment } from '@typescript/vfs';
import { continueKeymap } from '@valtown/codemirror-continue';
import { type HoverInfo, tsAutocomplete, tsFacet, tsHover, tsLinter, tsSync } from '@valtown/codemirror-ts';
import React from 'react';

import { Domino, type ThemeMode, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type EditorInputMode,
  InputModeExtensions,
  type UseTextEditorProps,
  createBasicExtensions,
  createThemeExtensions,
  defaultStyles,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

export type TypescriptEditorProps = ThemedClassName<
  {
    id: string;
    inputMode?: EditorInputMode;
    toolbar?: boolean;
    env?: VirtualTypeScriptEnvironment;
  } & Pick<UseTextEditorProps, 'initialValue' | 'extensions' | 'scrollTo' | 'selection'>
>;

export const TypescriptEditor = ({
  classNames,
  id,
  inputMode = 'vscode',
  toolbar,
  env,
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
      selection,
      scrollTo,
      extensions: [
        extensions,
        createBasicExtensions({
          highlightActiveLine: true,
          indentWithTab: true,
          lineNumbers: true,
          lineWrapping: false,
          monospace: true,
          scrollPastEnd: true,
          search: true,
        }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        InputModeExtensions[inputMode],

        javascript({ typescript: true }),
        autocompletion({ override: env ? [tsAutocomplete()] : undefined }),

        // Continues block comments when pressing Enter.
        Prec.high(keymap.of(continueKeymap)),
        keymap.of(completionKeymap),
        keymap.of(lintKeymap),

        // https://github.com/val-town/codemirror-ts
        env && [
          tsFacet.of({ env, path: `/src/${id}.ts` }),
          tsSync(),
          tsLinter(),
          tsHover({ renderTooltip: createTooltipRenderer(themeMode) }),
        ],
      ].filter(isNonNullable),
    }),
    [id, extensions, themeMode, inputMode, selection, scrollTo],
  );

  // TODO(brudon): Use react-ui-editor's Editor component.
  return (
    <div
      ref={parentRef}
      data-toolbar={toolbar ? 'enabled' : 'disabled'}
      className={mx('overflow-hidden', classNames)}
      {...focusAttributes}
    />
  );
};

// TODO(burdon): Factor out (react-ui-editor).
const createTooltipRenderer = (themeMode: ThemeMode) => {
  const theme = HighlightStyle.define(themeMode === 'dark' ? defaultStyles.dark : defaultStyles.light);

  const classFromKind = (_kind: string) => {
    // E.g., localName, methodName, parameterName, etc.
    const kind = _kind.endsWith('Name') ? 'name' : _kind;
    const validTag = kind in tags;
    if (!validTag) {
      return '';
    }

    const tag = tags[kind as keyof typeof tags];
    if (typeof tag === 'function') {
      return '';
    }

    return theme.style([tag]) ?? '';
  };

  return (info: HoverInfo) => {
    return {
      dom: Domino.of('div')
        .classNames('xs:max-is-80 max-is-lg p-1 bg-baseSurface rounded border border-separator')
        .children(
          ...(info.quickInfo?.displayParts?.map(({ kind, text }) =>
            Domino.of('span').classNames(classFromKind(kind)).text(text),
          ) ?? []),
        )
        .build(),
    };
  };
};

export default TypescriptEditor;
