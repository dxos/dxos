//
// Copyright 2024 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type DependencyList, type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { isNotFalsy } from '@dxos/util';

import { type TextEditorProps } from '../components';
import { documentId } from '../extensions';
import { logChanges } from '../util';

export type UseTextEditor = {
  parentRef: RefObject<HTMLDivElement>;
  view?: EditorView;
};

export type UseTextEditorProps = Omit<TextEditorProps, 'moveToEndOfLine' | 'dataTestId'>;

/**
 * Hook for creating editor.
 */
export const useTextEditor = (cb: () => UseTextEditorProps = () => ({}), deps: DependencyList = []): UseTextEditor => {
  let { id, doc, selection, extensions, autoFocus, scrollTo, debug } = useMemo<UseTextEditorProps>(cb, deps ?? []);

  const onUpdate = useRef<() => void>();
  const [view, setView] = useState<EditorView>();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: EditorView;
    if (parentRef.current) {
      log('create', { id });

      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      // NOTE: Don't set selection here in case it is invalid (and crashes the state); dispatch below.
      const state = EditorState.create({
        doc,
        extensions: [
          id && documentId.of(id),
          // TODO(burdon): Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),
          extensions,
          EditorView.updateListener.of(() => {
            onUpdate.current?.();
          }),
        ].filter(isNotFalsy),
      });

      // https://codemirror.net/docs/ref/#view.EditorViewConfig
      view = new EditorView({
        parent: parentRef.current,
        scrollTo,
        state,
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
    }

    return () => {
      log('destroy', { id });
      view?.destroy();
    };
  }, deps);

  useEffect(() => {
    if (view) {
      // Select end of line if not specified.
      if (!selection && !view.state.selection.main.anchor) {
        selection = EditorSelection.single(view.state.doc.line(1).to);
      }

      // Set selection after first update (since content may rerender on focus).
      // TODO(burdon): Make invisible until first render?
      if (selection || scrollTo) {
        onUpdate.current = () => {
          onUpdate.current = undefined;
          view.dispatch({ selection, effects: scrollTo && [scrollTo], scrollIntoView: !scrollTo });
        };
      }

      if (autoFocus) {
        view.focus();
      }
    }
  }, [view, autoFocus, selection, scrollTo]);

  return { parentRef, view };
};
