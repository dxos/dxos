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
    onChange?: (value: string) => void;
  } & Omit<UseTextEditorProps, 'initialValue'>
>;

/**
 * Minimal text editor.
 * NOTE: This shouold not be used with the automerge extension.
 */
export const Editor = forwardRef<EditorController, EditorProps>(
  ({ classNames, id, extensions = [], value, onChange, ...props }, forwardedRef) => {
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        extensions: [
          extensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange?.(update.state.doc.toString());
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
          });
        });
      }
    }, [view, value]);

    return <div role='none' className={mx(classNames)} {...focusAttributes} ref={parentRef} />;
  },
);
