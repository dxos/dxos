//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { Editor, type EditorBinding, useEditorExtensions } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { getDeep } from '@dxos/util';

/** A markdown field's minimum height in lines. */
const ROWS = 6;

/** A text area's minimum height in lines. */
const TEXT_AREA_ROWS = 3;

const fieldTheme = EditorView.theme({
  '&': { minHeight: '100%' },
  '.cm-content': { overflowWrap: 'anywhere' },
  '& .cm-content .cm-code-inline': { whiteSpace: 'break-spaces', height: 'auto', overflow: 'visible' },
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

export type BoundTextEditorProps = {
  binding: EditorBinding;
  /** Multi-line markdown, framed like a text area; otherwise one line of plain text, framed like an input. */
  markdown?: boolean;
  /** Multi-line plain text, framed like a text area. */
  multiline?: boolean;
  placeholder?: string;
  readonly?: boolean;
  /** `title` and `plain` edit in place: no well, and one line until the text grows. */
  variant?: 'default' | 'plain' | 'title';
  autoFocus?: boolean;
  testId?: string;
};

/**
 * Edits a string of an ECHO object in place: keystrokes splice the object's text, so concurrent edits merge and
 * cursors into it (comment anchors) survive. Extensions from enclosing `EditorExtensionsProvider`s are added.
 */
export const BoundTextEditor = ({
  binding,
  markdown,
  multiline,
  placeholder,
  readonly,
  variant,
  autoFocus,
  testId,
}: BoundTextEditorProps) => {
  const { object, path } = binding;
  // Callers pass a fresh path array each render; rebinding on its identity would rebuild the editor per keystroke.
  const pathKey = JSON.stringify(path);
  // The editor splices into an existing string. A missing one is created when the field takes focus, not when it is
  // shown, so viewing an object never writes to it; the editor then rebinds to the new string, keeping the focus until
  // the field is left, so a later rebuild does not take it back.
  const [created, setCreated] = useState<string>();
  // Read key by key, since `Obj.getValue`'s JSON path refuses record keys such as `F-1.1`.
  const value = getDeep<unknown>(object, path);
  const ready = typeof value === 'string';
  const handleFocus = useCallback(() => {
    if (!readonly && typeof getDeep(object, path) !== 'string') {
      Obj.update(object, (object) => Obj.setValue(object, path, ''));
      setCreated(pathKey);
    }
  }, [readonly, object, pathKey]);

  const themeMode = Hooks.useThemeMode();
  const bindingExtensions = useEditorExtensions(ready ? binding : undefined);
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder, readOnly: readonly, lineWrapping: true }),
      createThemeExtensions({ syntaxHighlighting: markdown, themeMode }),
      markdown ? [createMarkdownExtensions(), decorateMarkdown(), fieldTheme] : multiline ? fieldTheme : singleLine,
      ready
        ? [
            createDataExtensions({ id: Obj.getURI(object), text: Doc.createAccessor(object, [...path]) }),
            EditorView.domEventHandlers({ blur: () => setCreated(undefined) }),
            ...bindingExtensions,
          ]
        : EditorView.domEventHandlers({ focus: () => handleFocus() }),
    ],
    [ready, placeholder, readonly, markdown, multiline, themeMode, object, pathKey, bindingExtensions, handleFocus],
  );

  const inPlace = variant === 'title' || variant === 'plain';
  return (
    <Input.Frame
      rows={markdown || multiline ? (inPlace ? 1 : markdown ? ROWS : TEXT_AREA_ROWS) : undefined}
      variant={variant}
      disabled={readonly}
      data-testid={testId}
    >
      <Editor.Root>
        {/* Seeded with the string, so the editor holds it from its first frame rather than once the binding syncs. */}
        <Editor.View
          extensions={extensions}
          initialValue={typeof value === 'string' ? value : ''}
          autoFocus={autoFocus || created === pathKey}
        />
      </Editor.Root>
    </Input.Frame>
  );
};
