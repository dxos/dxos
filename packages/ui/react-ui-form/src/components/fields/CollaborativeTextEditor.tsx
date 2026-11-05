//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { type Doc } from '@dxos/echo-doc';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { useCollaborativeText } from '../../hooks/index.ts';

/** A text area's minimum height in lines. */
const TEXT_AREA_ROWS = 3;

const multilineTheme = EditorView.theme({
  '&': { minHeight: '100%' },
  '.cm-content': { overflowWrap: 'anywhere' },
});

/**
 * One line, like an input: typing or pasting a line break is refused, and Enter leaves the field. The Enter binding
 * outranks the standard keymap's, which would otherwise take the key and insert the refused line break.
 */
const singleLine: Extension = [
  EditorState.transactionFilter.of((tr) =>
    tr.docChanged && (tr.isUserEvent('input') || tr.isUserEvent('move')) && tr.newDoc.lines > tr.startState.doc.lines
      ? []
      : tr,
  ),
  Prec.high(keymap.of([{ key: 'Enter', run: (view) => (view.contentDOM.blur(), true) }])),
];

export type CollaborativeTextEditorProps = {
  /** The live object holding the string. */
  object: Obj.Unknown;
  /** The string's key path in `object`. */
  path: Doc.KeyPath;
  /** Added once the editor is bound to the string, such as comments on it. */
  extensions?: Extension[];
  /** Multi-line, framed like a text area; otherwise one line, framed like an input. */
  multiline?: boolean;
  placeholder?: string;
  readonly?: boolean;
  /** `title` and `plain` edit in place: no well, and one line until the text grows. */
  variant?: 'default' | 'plain' | 'title';
  autoFocus?: boolean;
  testId?: string;
};

/**
 * Edits a plain-text string of an ECHO object as collaborative text (see `useCollaborativeText`), where a form's text
 * input or text area would otherwise take a value. A markdown string is `MarkdownField`'s.
 */
export const CollaborativeTextEditor = ({
  object,
  path,
  extensions: extensionsProp,
  multiline,
  placeholder,
  readonly,
  variant,
  autoFocus,
  testId,
}: CollaborativeTextEditorProps) => {
  const binding = useCollaborativeText({ object, path, extensions: extensionsProp, readonly });
  const themeMode = Hooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder, readOnly: readonly, lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      multiline ? multilineTheme : singleLine,
      binding.extensions,
    ],
    [placeholder, readonly, multiline, themeMode, binding.extensions],
  );

  const inPlace = variant === 'title' || variant === 'plain';
  return (
    <Input.Frame
      rows={multiline ? (inPlace ? 1 : TEXT_AREA_ROWS) : undefined}
      variant={variant}
      disabled={readonly}
      data-testid={testId}
    >
      <Editor.Root>
        <Editor.View
          extensions={extensions}
          initialValue={binding.initialValue}
          autoFocus={autoFocus || binding.autoFocus}
        />
      </Editor.Root>
    </Input.Frame>
  );
};
