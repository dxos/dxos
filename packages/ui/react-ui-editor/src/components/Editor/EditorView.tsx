//
// Copyright 2025 DXOS.org
//

import { Transaction } from '@codemirror/state';
import { EditorView as NaturalEditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { computeDocChanges, initialSync } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type UseTextEditorProps, useTextEditor } from '../../hooks/index.ts';
import { type EditorController, createEditorController } from './controller.ts';

export type EditorViewProps = Util.ThemedClassName<
  {
    focusable?: boolean;
    value?: string;
    onChange?: (value: string) => void;
  } & UseTextEditorProps
>;

/** Bounds the echoes held for a caller that never passes its `onChange` value back. */
const MAX_EMITTED = 100;

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

    // Docs reported through `onChange` that have not come back as `value` yet, oldest first.
    const emittedRef = useRef<string[]>([]);

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
              const doc = view.state.doc.toString();
              emittedRef.current = [...emittedRef.current.slice(1 - MAX_EMITTED), doc];
              onChangeRef.current?.(doc);
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

    // Sync the editor doc to the controlled `value` prop when the caller changed it. A `value` the editor
    // itself emitted is an echo, not a change: when the caller renders slower than the user types, it
    // arrives behind the doc, and applying it would delete the keystrokes typed since.
    //
    // `undefined` means uncontrolled: the doc was seeded once from `value` at creation and the caller
    // isn't driving it, so leave it be (coalescing undefined→'' here would wipe that seed on mount). A
    // controlled caller clears the doc by passing '' explicitly.
    useEffect(() => {
      if (!view || value === undefined) {
        return;
      }
      const next = value;
      const echo = emittedRef.current.indexOf(next);
      emittedRef.current = echo === -1 ? [] : emittedRef.current.slice(echo + 1);
      if (echo !== -1 || view.state.doc.toString() === next) {
        return;
      }
      requestAnimationFrame(() => {
        const current = view.state.doc.toString();
        if (current === next) {
          return;
        }
        // Only what moved: replacing the whole document would drop the reader's folds, selection
        // and scroll position on every update of a value they are mostly already looking at.
        const changes = computeDocChanges(current, next);
        if (changes.length === 0) {
          return;
        }

        view.dispatch({
          annotations: initialSync,
          changes,
          selection: selectionEnd ? { anchor: next.length } : undefined,
        });

        if (selectionEnd) {
          view.focus();
        }
      });
    }, [view, value, selectionEnd]);

    // Focus chrome (border/ring) is the caller's responsibility (e.g. `dx-input-box`).
    return (
      <div
        className={mx('w-full outline-hidden', classNames)}
        {...(focusable ? focusAttributes : {})}
        ref={parentRef}
      />
    );
  },
);
