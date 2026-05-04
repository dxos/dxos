//
// Copyright 2025 DXOS.org
//

import { Transaction } from '@codemirror/state';
import { EditorView as NaturalEditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { initialSync } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type UseTextEditorProps, useTextEditor } from '../../hooks';
import { type EditorController, createEditorController, noopController } from './controller';

export type EditorViewProps = ThemedClassName<
  {
    focusable?: boolean;
    value?: string;
    onChange?: (value: string) => void;
  } & UseTextEditorProps
>;

/**
 * Minimal text editor.
 * NOTE: This shouold not be used with the automerge extension.
 */
// TODO(burdon): Move controller to Root component, then make composable.
export const EditorView = forwardRef<EditorController, EditorViewProps>(
  ({ classNames, id, extensions, selectionEnd, focusable = true, value, onChange, ...props }, forwardedRef) => {
    // Hold the latest onChange in a ref so callers may pass an inline callback
    // without forcing the underlying editor to be destroyed and recreated on
    // every render — which would blur the focused input on each keystroke.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        initialValue: value,
        selectionEnd,
        extensions: [
          extensions ?? [],
          NaturalEditorView.updateListener.of(({ view, docChanged, transactions }) => {
            const isInitialSync = transactions.some((tr) => tr.annotation(Transaction.userEvent) === initialSync.value);
            if (!isInitialSync && docChanged) {
              onChangeRef.current?.(view.state.doc.toString());
            }
          }),
        ],
        ...props,
      }),
      [id, extensions, selectionEnd],
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
          'w-full outline-hidden focus:border-accent-surface focus-within:border-neutral-focus-indicator',
          classNames,
        )}
        {...(focusable ? focusAttributes : {})}
        ref={parentRef}
      />
    );
  },
);

export { type EditorController, createEditorController, noopController };
