//
// Copyright 2026 DXOS.org
//

import { json as jsonLanguage } from '@codemirror/lang-json';
import React, { useCallback } from 'react';

import { diagram as diagramLanguage } from '@dxos/diagram/extension';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import { composable } from '@dxos/react-ui/Util';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';

export type SourceLanguage = 'dsl' | 'json';

export type SourceEditorProps = {
  /** The text the editor opens on. It is read once: give the editor a new `key` to show other text. */
  value: string;
  language?: SourceLanguage;
  /** Called with the whole text after each edit; without it the editor is read-only. */
  onTextChange?: (text: string) => void;
};

/**
 * A drawing's text in the diagram language, or its records as JSON. CodeMirror takes its language and its first
 * document at construction, so the editor is re-created when either should change rather than reconfigured.
 *
 * `composable()`, so a slot (`Panel.Body asChild`) can hand it the slot's class, `data-part` and ref.
 */
export const SourceEditor = composable<HTMLDivElement, SourceEditorProps>(
  ({ value, language = 'dsl', onTextChange, className, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    const { parentRef, focusAttributes } = useTextEditor(
      () => ({
        initialValue: value,
        extensions: [
          createBasicExtensions({ lineNumbers: true, readOnly: onTextChange === undefined }),
          createThemeExtensions({ themeMode, syntaxHighlighting: true }),
          ...(language === 'json' ? [jsonLanguage()] : [diagramLanguage({ layout: false })]),
          ...(onTextChange ? [listener({ onChange: ({ text }) => onTextChange(text) })] : []),
        ],
      }),
      [themeMode, language],
    );
    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        parentRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef, parentRef],
    );
    return (
      <div
        data-testid='source-editor'
        {...props}
        {...focusAttributes}
        ref={setRef}
        className={['overflow-hidden', className].filter(Boolean).join(' ')}
      />
    );
  },
);

SourceEditor.displayName = 'SourceEditor';
