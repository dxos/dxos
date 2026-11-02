//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { useLayoutEffect, useMemo, useState } from 'react';

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

/** A markdown field's minimum height in lines. */
const ROWS = 6;

/** A text area's minimum height in lines. */
const TEXT_AREA_ROWS = 3;

const fieldTheme = EditorView.theme({
  '&': { minHeight: '100%' },
  '.cm-content': { overflowWrap: 'anywhere' },
  '& .cm-content .cm-code-inline': { whiteSpace: 'break-spaces', height: 'auto', overflow: 'visible' },
});

/** One line, like an input: typing or pasting a line break is refused, and Enter leaves the field. */
const singleLine: Extension = [
  EditorState.transactionFilter.of((tr) =>
    tr.docChanged && (tr.isUserEvent('input') || tr.isUserEvent('move')) && tr.newDoc.lines > 1 ? [] : tr,
  ),
  keymap.of([{ key: 'Enter', run: (view) => (view.contentDOM.blur(), true) }]),
];

export type BoundTextEditorProps = {
  binding: EditorBinding;
  /** Multi-line markdown, framed like a text area; otherwise one line of plain text, framed like an input. */
  markdown?: boolean;
  /** Multi-line plain text, framed like a text area. */
  multiline?: boolean;
  placeholder?: string;
  readonly?: boolean;
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
  autoFocus,
  testId,
}: BoundTextEditorProps) => {
  const { object, path } = binding;
  // Callers pass a fresh path array each render; rebinding on its identity would rebuild the editor per keystroke.
  const pathKey = JSON.stringify(path);
  // The editor splices into an existing string, so a missing one is created before it binds.
  const [ready, setReady] = useState(() => typeof Obj.getValue(object, path) === 'string');
  useLayoutEffect(() => {
    if (!ready && !readonly) {
      Obj.update(object, (object) => Obj.setValue(object, path, ''));
      setReady(true);
    }
  }, [ready, readonly, object, pathKey]);

  const themeMode = Hooks.useThemeMode();
  const bindingExtensions = useEditorExtensions(ready ? binding : undefined);
  const extensions = useMemo(
    () =>
      ready
        ? [
            createBasicExtensions({ placeholder, readOnly: readonly, lineWrapping: true }),
            createThemeExtensions({ syntaxHighlighting: markdown, themeMode }),
            markdown
              ? [createMarkdownExtensions(), decorateMarkdown(), fieldTheme]
              : multiline
                ? fieldTheme
                : singleLine,
            createDataExtensions({ id: Obj.getURI(object), text: Doc.createAccessor(object, [...path]) }),
            ...bindingExtensions,
          ]
        : [],
    [ready, placeholder, readonly, markdown, multiline, themeMode, object, pathKey, bindingExtensions],
  );
  if (!ready) {
    return null;
  }

  return (
    <Input.Frame
      rows={markdown ? ROWS : multiline ? TEXT_AREA_ROWS : undefined}
      disabled={readonly}
      data-testid={testId}
    >
      <Editor.Root>
        {/* Seeded with the string, so the editor holds it from its first frame rather than once the binding syncs. */}
        <Editor.View extensions={extensions} initialValue={Obj.getValue(object, path)} autoFocus={autoFocus} />
      </Editor.Root>
    </Input.Frame>
  );
};
