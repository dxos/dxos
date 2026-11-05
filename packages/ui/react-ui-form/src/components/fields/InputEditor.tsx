//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { useMemo } from 'react';

import { Editor, type TextEditorProps } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

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

export type InputEditorProps = {
  /** Added to the editor's own: a language, a binding to the text it edits, comments on it, the other peers' carets. */
  extensions?: Extension[];
  /** Multi-line, framed like a text area at least this many lines high; unset, one line, framed like an input. */
  rows?: number;
  placeholder?: string;
  readonly?: boolean;
  /** `title` and `plain` edit in place: no well, and one line until the text grows. */
  variant?: 'default' | 'plain' | 'title';
  testId?: string;
} & Pick<TextEditorProps, 'value' | 'initialValue' | 'autoFocus' | 'onChange'>;

/** A CodeMirror editor framed as a form control, where a text input or text area would be. */
export const InputEditor = ({
  extensions: extensionsProp,
  rows,
  placeholder,
  readonly,
  variant,
  testId,
  onChange,
  ...props
}: InputEditorProps) => {
  const themeMode = Hooks.useThemeMode();
  const multiline = rows !== undefined;
  // Memoised: a new list each render would reconfigure the editor on every keystroke and drop its focus.
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder, readOnly: readonly, lineWrapping: true }),
      createThemeExtensions({ syntaxHighlighting: true, themeMode }),
      multiline ? multilineTheme : singleLine,
      extensionsProp ?? [],
    ],
    [placeholder, readonly, multiline, themeMode, extensionsProp],
  );

  const inPlace = variant === 'title' || variant === 'plain';
  return (
    // Rows, so the frame grows as the text wraps, which even one line does; a title's frame grows already.
    <Input.Frame
      rows={multiline && !inPlace ? rows : variant === 'title' ? undefined : 1}
      variant={variant}
      disabled={readonly}
      data-testid={testId}
    >
      <Editor.Root>
        <Editor.View {...props} extensions={extensions} onChange={readonly ? undefined : onChange} />
      </Editor.Root>
    </Input.Frame>
  );
};
