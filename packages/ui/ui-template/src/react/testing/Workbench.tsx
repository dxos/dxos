//
// Copyright 2026 DXOS.org
//

//
// Shared story scaffolding. Deliberately not part of the package's exports: stories consume it via
// a relative import; nothing ships.
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { ReactNode, useRef } from 'react';

import { Flex, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { Empty, Listbox } from '@dxos/react-ui-list';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { type SequencedLogEntry } from '../useSystem';

//
// Workbench
//

export type Pane = {
  title: string;
  children: ReactNode;
  /** Relative share of the stack (flex-grow weight; the grid renders it as `<size>fr`). Default 1. */
  size?: number;
};

export type WorkbenchProps = {
  /** Stacked panes on the left. */
  panes: Pane[];
  /** The render pane on the right. */
  main: Pane;
};

/** The shared story frame: a stack of tool panes beside the rendered result. */
export const Workbench = ({ panes, main }: WorkbenchProps) => (
  <Flex classNames='dx-container grid grid-cols-2 divide-x divide-separator' align='stretch'>
    <Flex
      column
      grow
      classNames='dx-container grid divide-y divide-separator'
      style={{ gridTemplateRows: panes.map((pane) => `${pane.size ?? 1}fr`).join(' ') }}
    >
      {panes.map((pane) => (
        <Cell key={pane.title} title={pane.title}>
          {pane.children}
        </Cell>
      ))}
    </Flex>
    <div className='dx-container flex flex-col p-4'>{main.children}</div>
  </Flex>
);

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
  // The callback goes through a ref: an inline `onChange` closure changes identity every render,
  // and keying the editor on it would recreate CodeMirror — and drop focus — on each keystroke.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnly = !onChange;
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: value,
      extensions: [
        createThemeExtensions({ themeMode, slots: compactSlots, syntaxHighlighting: true, monospace: true }),
        createBasicExtensions({ readOnly, lineWrapping: false }),
        ...extensions,
        ...(readOnly ? [] : [mirrorTo((next) => onChangeRef.current?.(next))]),
      ],
    }),
    // An editable editor owns its text once mounted, so it must NOT key on `value` — recreating it
    // on every keystroke would lose the cursor. A read-only one has no such state, and keys on
    // `value` so an externally changed document is picked up.
    [themeMode, extensions, readOnly, readOnly ? value : null],
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
