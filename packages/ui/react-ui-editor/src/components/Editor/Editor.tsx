//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type UseTextEditorProps, useTextEditor } from '../../hooks';

export type EditorController = {
  view: EditorView | null;
  focus: () => void;
};

export type EditorProps = ThemedClassName<
  {
    value?: string;
    moveToEnd?: boolean;
    onChange?: (value: string) => void;
  } & Omit<UseTextEditorProps, 'initialValue'>
>;

/**
 * Minimal text editor.
 * NOTE: This shouold not be used with the automerge extension.
 */
export const Editor = forwardRef<EditorController, EditorProps>(
  ({ classNames, id, extensions = [], value, moveToEnd, onChange, ...props }, forwardedRef) => {
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        extensions: [
          extensions,
          EditorView.updateListener.of((update) => {
            const startValue = update.startState.doc.toString();
            const value = update.state.doc.toString();
            if (startValue !== value) {
              onChange?.(value);
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

    // Update content.
    useEffect(() => {
      if (value !== view?.state.doc.toString()) {
        requestAnimationFrame(() => {
          view?.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
            selection: moveToEnd ? { anchor: value?.length ?? 0 } : undefined,
          });
        });
      }
    }, [view, value, moveToEnd]);

    return <div role='none' className={mx('is-full', classNames)} {...focusAttributes} ref={parentRef} />;
  },
);
