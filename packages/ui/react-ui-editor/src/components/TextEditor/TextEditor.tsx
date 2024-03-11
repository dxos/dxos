//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import React, {
  type KeyboardEventHandler,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';

import { editorMode } from '../../extensions';
import { logChanges } from '../../util';

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  length: number;
  after?: string;
};

export type TextEditorProps = {
  dataTestId?: string; // TODO(burdon): Generalize?
  doc?: string; // TODO(burdon): Rename text/value/content?
  className?: string;
  autoFocus?: boolean;
  scrollTo?: StateEffect<any>; // TODO(burdon): Restore scroll position: scrollTo EditorView.scrollSnapshot().
  moveToEndOfLine?: boolean;
  selection?: { anchor: number; head?: number };
  extensions?: Extension[];
  debug?: boolean;
};

/**
 * Thin wrapper for text editor.
 * Handles tabster and focus management.
 */
export const TextEditor = forwardRef<EditorView | null, TextEditorProps>(
  (
    {
      doc,
      className,
      autoFocus,
      scrollTo = EditorView.scrollIntoView(0),
      moveToEndOfLine,
      selection,
      extensions = [],
      debug,
    },
    forwardedRef,
  ) => {
    // TODO(burdon): Make tabster optional.
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    // The view ref can be used to focus the editor.
    // NOTE: Ref updates do not cause the parent to re-render; also the ref is not available immediately.
    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    // Set focus.
    useEffect(() => {
      if (autoFocus) {
        view?.focus();
      }
    }, [view, autoFocus]);

    // Create editor state and view.
    // The view is recreated if the model or extensions are changed.
    useEffect(() => {
      log.info('updating', { selection, scrollTo, extensions: extensions.length });

      //
      // EditorState
      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      //
      const state = EditorState.create({
        doc,
        selection,
        extensions: [
          // TODO(burdon): NOTE: Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),

          // Focus.
          EditorView.updateListener.of((update) => {
            update.transactions.forEach((transaction) => {
              if (transaction.isUserEvent('focus.container')) {
                rootRef.current?.focus();
              }
            });
          }),

          ...extensions,
        ],
      });

      //
      // EditorView
      // https://codemirror.net/docs/ref/#view.EditorViewConfig
      //
      const view = new EditorView({
        state,
        parent: rootRef.current!,
        scrollTo,
        // NOTE: Uncomment to debug/monitor all transactions.
        // https://codemirror.net/docs/ref/#view.EditorView.dispatch
        dispatchTransactions: (trs, view) => {
          if (debug) {
            logChanges(trs);
          }
          view.update(trs);
        },
      });

      setView(view);

      // Position cursor at end of line.
      if (moveToEndOfLine) {
        const { to } = view.state.doc.lineAt(0);
        view?.dispatch({ selection: { anchor: to } });
      }

      // Remove tabster attribute (rely on custom keymap).
      if (state.facet(editorMode).noTabster) {
        rootRef.current?.removeAttribute('data-tabster');
      }

      return () => {
        view?.destroy();
        setView(null);
      };
    }, [doc, selection, extensions]);

    // Focus editor on Enter (e.g., when tabbing to this component).
    const handleKeyUp = useCallback<KeyboardEventHandler<HTMLDivElement>>(
      (event) => {
        const { key } = event;
        switch (key) {
          case 'Enter': {
            view?.focus();
            break;
          }
        }
      },
      [view],
    );

    return (
      <div
        role='none'
        ref={rootRef}
        tabIndex={0}
        className={className}
        onKeyUp={handleKeyUp}
        {...tabsterDOMAttribute}
      />
    );
  },
);
