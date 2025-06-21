//
// Copyright 2024 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { type VirtualTypeScriptEnvironment } from '@typescript/vfs';
import { continueKeymap } from '@valtown/codemirror-continue';
import { tsSync, tsFacet, tsLinter, tsAutocomplete, tsHover, type HoverInfo } from '@valtown/codemirror-ts';
import React from 'react';

import { type ThemedClassName, type ThemeMode, useThemeContext } from '@dxos/react-ui';
import {
  type EditorInputMode,
  InputModeExtensions,
  type UseTextEditorProps,
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  folding,
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
        }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        InputModeExtensions[inputMode],
        folding(),
        // Continues block comments when pressing Enter.
        Prec.high(keymap.of(continueKeymap)),

        // TODO(burdon): Factor out.
        javascript({ typescript: true }),
        // https://github.com/val-town/codemirror-ts
        autocomplete({ override: env ? [tsAutocomplete()] : undefined }),
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

  return (
    <div
      ref={parentRef}
      data-toolbar={toolbar ? 'enabled' : 'disabled'}
      className={mx(classNames)}
      {...focusAttributes}
    />
  );
};

const createTooltipRenderer = (themeMode: ThemeMode) => {
  const theme = themeMode === 'dark' ? oneDarkHighlightStyle : defaultHighlightStyle;

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
    const div = document.createElement('div');
    div.className = 'p-1 rounded border border-separator bg-baseSurface xs:max-w-80 max-w-lg';

    if (info.quickInfo?.displayParts) {
      for (const part of info.quickInfo.displayParts) {
        const span = div.appendChild(document.createElement('span'));
        span.className = classFromKind(part.kind);
        span.innerText = part.text;
      }
    }

    return { dom: div };
  };
};

export default TypescriptEditor;
