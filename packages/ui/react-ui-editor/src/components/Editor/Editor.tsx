//
// Copyright 2025 DXOS.org
//

import { Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { initialSync } from '../../extensions';
import { type UseTextEditorProps, useTextEditor } from '../../hooks';

// TODO(burdon): Convert to radix-style (support hooks inside).
// <Editor.Root>
//   <Editor.Toolbar />
//   <Editor.TextEditor />
// </Editor.Root>

export type EditorController = {
  view: EditorView | null;
  focus: () => void;
};

export type EditorProps = ThemedClassName<
  {
    moveToEnd?: boolean;
    value?: string;
    onChange?: (value: string) => void;
  } & UseTextEditorProps
>;

/**
 * Minimal text editor.
 * NOTE: This shouold not be used with the automerge extension.
 */
export const Editor = forwardRef<EditorController, EditorProps>(
  ({ classNames, id, extensions, moveToEnd, value, onChange, ...props }, forwardedRef) => {
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        initialValue: value,
        extensions: [
          extensions ?? [],
          EditorView.updateListener.of(({ view, docChanged, transactions }) => {
            const isInitialSync = transactions.some((tr) => tr.annotation(Transaction.userEvent) === initialSync.value);
            if (!isInitialSync && docChanged) {
              onChange?.(view.state.doc.toString());
            }
          }),
        ],
        ...props,
      }),
      [id, extensions, onChange],
    );

    // External controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        view,
        focus: () => view?.focus(),
      }),
      [view],
    );

    // Set initial value and cursor position.
    useEffect(() => {
      requestAnimationFrame(() => {
        view?.dispatch({
          annotations: initialSync,
          changes: value ? [{ from: 0, to: view?.state.doc.length ?? 0, insert: value ?? '' }] : [],
          selection: moveToEnd ? { anchor: view?.state.doc.length ?? 0 } : undefined,
        });
        view?.focus();
      });
    }, [view, value, moveToEnd]);

    return <div role='none' className={mx('is-full', classNames)} {...focusAttributes} ref={parentRef} />;
  },
);
