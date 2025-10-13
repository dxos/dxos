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

        // Continues block comments when pressing Enter.
        Prec.high(keymap.of(continueKeymap)),

        // TODO(burdon): Factor out.
        javascript({ typescript: true }),

        // https://github.com/val-town/codemirror-ts
        keymap.of(completionKeymap),

        autocompletion({ override: env ? [tsAutocomplete()] : undefined }),
        keymap.of(lintKeymap),

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

  // TODO(brudon): Use editor.
  return (
    <div
      ref={parentRef}
      data-toolbar={toolbar ? 'enabled' : 'disabled'}
      className={mx('bs-full overflow-hidden', classNames)}
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
        .classNames('p-1 rounded border border-separator bg-baseSurface xs:max-w-80 max-w-lg')
        .children(
          ...(info.quickInfo?.displayParts?.map((part) =>
            Domino.of('span').classNames(classFromKind(part.kind)).text(part.text),
          ) ?? []),
        )
        .build(),
    };
  };
};

export default TypescriptEditor;
