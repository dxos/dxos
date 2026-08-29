//
// Copyright 2026 DXOS.org
//

//
// Shared story scaffolding. Deliberately not part of the package's exports: stories consume it via
// a relative import; nothing ships.
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React from 'react';

import { Flex, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { Empty, Listbox } from '@dxos/react-ui-list';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { type SequencedLogEntry } from './useSystem';

//
// Cell
//

export type CellProps = {
  title: string;
  children: React.ReactNode;
};

/** One titled pane in a story grid. */
export const Cell = ({ title, children }: CellProps) => (
  <Flex column classNames='dx-container'>
    <div className='px-2 py-1 text-xs uppercase tracking-wide text-description border-be border-separator'>{title}</div>
    <Flex column grow classNames='dx-container'>
      {children}
    </Flex>
  </Flex>
);

//
// Editor
//

/** Mirror the document out on change so dependent panes follow the editor. */
const mirrorTo = (onChange: (value: string) => void) =>
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

export type EditorProps = {
  value: string;
  extensions: Extension[];
  /** Omit for a read-only pane. */
  onChange?: (value: string) => void;
};

/** One CodeMirror pane: monospace, theme-following, syntax highlighting on. */
export const Editor = ({ value, extensions, onChange }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: value,
      extensions: [
        createThemeExtensions({ themeMode, slots: compactSlots, syntaxHighlighting: true, monospace: true }),
        createBasicExtensions({ readOnly: !onChange, lineWrapping: false }),
        ...extensions,
        ...(onChange ? [mirrorTo(onChange)] : []),
      ],
    }),
    // An editable editor owns its text once mounted, so it must NOT key on `value` — recreating it
    // on every keystroke would lose the cursor. A read-only one has no such state, and keys on
    // `value` so an externally changed document is picked up.
    [themeMode, extensions, onChange, onChange ? null : value],
  );

  return <div ref={parentRef} className='flex-1 min-h-0 overflow-auto' />;
};

//
// Operation log
//

export type OperationLogProps = {
  entries: readonly SequencedLogEntry[];
};

/**
 * The operation log as a proper list (never a hand-rolled map of spans): a read-only Listbox —
 * flat rows, keyboard traversal for free, `Empty` when nothing has been dispatched yet.
 */
export const OperationLog = ({ entries }: OperationLogProps) => (
  <Listbox.Root>
    <Listbox.Viewport>
      <Listbox.Content aria-label='Operation log'>
        {entries.map((entry) => (
          <Listbox.Item key={entry.seq} id={String(entry.seq)}>
            <Listbox.ItemLabel classNames='font-mono text-xs'>
              {entry.operation}
              {entry.payload !== undefined ? ` ${JSON.stringify(entry.payload)}` : ''}
            </Listbox.ItemLabel>
          </Listbox.Item>
        ))}
        {entries.length === 0 && <Empty label='No operations dispatched.' />}
      </Listbox.Content>
    </Listbox.Viewport>
  </Listbox.Root>
);
