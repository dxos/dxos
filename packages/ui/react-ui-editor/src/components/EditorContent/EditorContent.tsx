//
// Copyright 2025 DXOS.org
//

import { Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { initialSync } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type UseTextEditorProps, useTextEditor } from '../../hooks';

import { type EditorController, createEditorController } from './controller';

export type EditorContentProps = ThemedClassName<
  {
    focusable?: boolean;
    value?: string;
    onChange?: (value: string) => void;
  } & UseTextEditorProps
>;

/**
 * Minimal text editor.
 * NOTE: This shouold not be used with the automerge extension.
 * @deprecated Use Editor.Content
 */
export const EditorContent = forwardRef<EditorController, EditorContentProps>(
  ({ classNames, id, extensions, selectionEnd, focusable = true, value, onChange, ...props }, forwardedRef) => {
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        initialValue: value,
        selectionEnd,
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
      [id, extensions, selectionEnd, onChange],
    );

    // External controller.
    useImperativeHandle(forwardedRef, () => {
      return createEditorController(view);
    }, [id, view]);

    // Set initial value and cursor position.
    useEffect(() => {
      requestAnimationFrame(() => {
        view?.dispatch({
          annotations: initialSync,
          changes: value ? [{ from: 0, to: view?.state.doc.length ?? 0, insert: value ?? '' }] : [],
          selection: selectionEnd ? { anchor: view?.state.doc.length ?? 0 } : undefined,
        });

        if (selectionEnd) {
          view?.focus();
        }
      });
    }, [view, value, selectionEnd]);

    return (
      <div
        role='none'
        className={mx(
          'is-full outline-none focus:border-accentSurface focus-within:border-neutralFocusIndicator',
          classNames,
        )}
        ref={parentRef}
        {...(focusable ? focusAttributes : {})}
      />
    );
  },
);
