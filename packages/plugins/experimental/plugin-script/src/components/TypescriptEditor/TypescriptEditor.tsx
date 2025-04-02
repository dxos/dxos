//
// Copyright 2024 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { defaultHighlightStyle } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { type ViewUpdate, ViewPlugin } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { continueKeymap } from '@valtown/codemirror-continue';
import { tsSync, tsFacet, tsAutocomplete, tsHover, type HoverInfo } from '@valtown/codemirror-ts';
import React from 'react';

import { log } from '@dxos/log';
import { type ThemeMode, useThemeContext } from '@dxos/react-ui';
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
import { isNonNullable } from '@dxos/util';

import { type Compiler } from '../../compiler';

export type TypescriptEditorProps = {
  id: string;
  inputMode?: EditorInputMode;
  compiler?: Compiler;
  toolbar?: boolean;
} & Pick<UseTextEditorProps, 'className' | 'initialValue' | 'extensions' | 'scrollTo' | 'selection'>;

export const TypescriptEditor = ({
  id,
  inputMode = 'vscode',
  compiler,
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
        // NOTE: Not using default editor gutter because folding for code works best right beside text.
        EditorView.theme({
          '.cm-gutters': {
            // Match margin from content.
            marginTop: '16px',
            background: 'var(--dx-baseSurface)',
          },
        }),
        InputModeExtensions[inputMode],
        folding(),
        // Continues block comments when you hit Enter.
        Prec.high(keymap.of(continueKeymap)),
        // TODO(burdon): Factor out.
        [
          editorMonospace,
          javascript({ typescript: true }),
          // https://github.com/val-town/codemirror-ts
          autocomplete({ override: compiler ? [tsAutocomplete()] : [] }),
          compiler
            ? [
                tsFacet.of({ env: compiler.environment, path: `./src/${id}.ts` }),
                tsSync(),
                // TODO(wittjosiah): Transitive deps are not working.
                //   https://github.com/esm-dev/esm.sh/issues/1106
                // tsLinter(),
                tsHover({ renderTooltip: createTooltipRenderer(themeMode) }),
                tsHttpTypeLoader({ compiler, path: `./src/${id}.ts` }),
              ]
            : [],
        ],
      ].filter(isNonNullable),
      selection,
      scrollTo,
    }),
    [id, extensions, themeMode, inputMode, selection, scrollTo, compiler],
  );

  return (
    <div ref={parentRef} data-toolbar={toolbar ? 'enabled' : 'disabled'} className={className} {...focusAttributes} />
  );
};

// TODO(wittjosiah): Factor out.
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

// TODO(wittjosiah): Factor out.
function tsHttpTypeLoader({ compiler, path }: { compiler: Compiler; path: string }) {
  return ViewPlugin.fromClass(
    class {
      private debounceTimeout: NodeJS.Timeout | null = null;

      constructor(view: EditorView) {
        // Process imports immediately when the plugin is initialized.
        const initialContent = view.state.doc.toString();
        void compiler.processImports(path, initialContent).catch(log.catch);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          // Debounce the import processing.
          if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
          }

          this.debounceTimeout = setTimeout(() => {
            const content = update.state.doc.toString();
            void compiler.processImports(path, content).catch(log.catch);
          }, 300);
        }
      }

      destroy() {
        if (this.debounceTimeout) {
          clearTimeout(this.debounceTimeout);
        }
      }
    },
  );
}

export default TypescriptEditor;
