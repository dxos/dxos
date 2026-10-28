//
// Copyright 2026 DXOS.org
//

import { javascript } from '@codemirror/lang-javascript';
import { type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import React, { useMemo } from 'react';

import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { Editor } from '@dxos/react-ui-editor';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';

import { meta } from '#meta';

import { findSymbolLine } from './symbol.ts';

/** Highlights the symbol's line and scrolls it to the top third of the view once the editor has laid out. */
const revealLine = (line: number): Extension => [
  EditorView.theme({
    '.dx-symbol-line': {
      backgroundColor: 'var(--color-warning-surface)',
      boxShadow: 'inset 3px 0 0 var(--color-warning-text)',
    },
  }),
  EditorView.decorations.compute([], (state) =>
    line <= state.doc.lines
      ? Decoration.set([Decoration.line({ class: 'dx-symbol-line' }).range(state.doc.line(line).from)])
      : Decoration.none,
  ),
  ViewPlugin.define((view) => {
    // Deferred: a view cannot dispatch while it is being constructed.
    const timeout = setTimeout(() => {
      if (line <= view.state.doc.lines) {
        view.dispatch({
          effects: EditorView.scrollIntoView(view.state.doc.line(line).from, { y: 'start', yMargin: 80 }),
        });
      }
    });
    return { destroy: () => clearTimeout(timeout) };
  }),
];

const languageOf = (path: string): Extension =>
  path.endsWith('.mdl')
    ? [createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }), mdl()]
    : /\.[cm]?[jt]sx?$/.test(path)
      ? javascript({ typescript: /\.[cm]?tsx?$/.test(path), jsx: path.endsWith('x') })
      : [];

export type CodeViewProps = {
  /** The `github:` key shown in the header. */
  label: string;
  /** Repository-relative path, which picks the language. */
  path: string;
  content?: string;
  /** The symbol to reveal (`MyClass`, `Spec.make`). */
  symbol?: string;
  error?: string;
  /** Opens the file in the desktop editor, when the host can. */
  onOpenExternal?: (line?: number) => void;
};

/** A read-only source file revealed at a symbol: where Ctrl/⌘-click on a code key in a spec lands. */
export const CodeView = ({ label, path, content, symbol, error, onOpenExternal }: CodeViewProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const themeMode = Hooks.useThemeMode();
  const line = useMemo(() => (content && symbol ? findSymbolLine(content, symbol) : undefined), [content, symbol]);
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineNumbers: true, readOnly: true }),
      createThemeExtensions({ themeMode, slots: documentSlots, monospace: true, syntaxHighlighting: true }),
      languageOf(path),
      line !== undefined ? revealLine(line) : [],
    ],
    [themeMode, path, line],
  );

  return (
    <Panel.Root data-testid='code-view' data-symbol-line={line}>
      <Panel.Header>
        <Toolbar.Root>
          <Icon.Icon icon='ph--file-code--regular' />
          <Toolbar.Text classNames='font-mono text-xs'>
            <span title={label}>{label}</span>
          </Toolbar.Text>
          {symbol && line === undefined && content !== undefined && (
            <Toolbar.Text classNames='text-warning-text text-xs'>{t('code-view.symbol-not-found.label')}</Toolbar.Text>
          )}
          {onOpenExternal && (
            <Button.Root
              icon='ph--arrow-square-out--regular'
              iconOnly
              label={t('code-view.open-external.label')}
              onClick={() => onOpenExternal(line)}
              data-testid='code-view.open-external'
            />
          )}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {error ? (
          <Layout.Flex classNames='p-4 text-error-text'>{error}</Layout.Flex>
        ) : content === undefined ? (
          <Layout.Flex classNames='p-4 text-description'>{t('code-view.loading.label')}</Layout.Flex>
        ) : (
          // Keyed on the file and symbol, so following a second link rebuilds the view at its line.
          <div className='relative overflow-auto h-full' key={`${path}#${symbol}`}>
            <Editor.Root extensions={extensions}>
              <Editor.View classNames={editorClassNames('article')} value={content} />
            </Editor.Root>
          </div>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
