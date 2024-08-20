//
// Copyright 2024 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import {
  type DependencyList,
  type KeyboardEventHandler,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { isNotFalsy } from '@dxos/util';

import { type TextEditorProps } from '../components';
import { documentId } from '../extensions';
import { logChanges } from '../util';

export type UseTextEditor = {
  parentRef: RefObject<HTMLDivElement>;
  view?: EditorView;
  focusAttributes: ReturnType<typeof useFocusableGroup> & {
    tabIndex: 0;
    onKeyUp: KeyboardEventHandler<HTMLDivElement>;
  };
};

export type UseTextEditorProps = Omit<TextEditorProps, 'dataTestId'>;

type Provider<T> = T | (() => T);

/**
 * Hook for creating editor.
 */
export const useTextEditor = (props: Provider<UseTextEditorProps> = {}, deps: DependencyList = []): UseTextEditor => {
  const { id, doc, initialValue, selection, extensions, autoFocus, moveToEndOfLine, scrollTo, debug } =
    useMemo<UseTextEditorProps>(() => {
      return typeof props === 'function' ? props() : props;
    }, deps ?? []);

  const onUpdate = useRef<() => void>();
  const [view, setView] = useState<EditorView>();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: EditorView;
    if (parentRef.current) {
      log('create', { id, doc: doc?.length ?? 0 });

      let initialSelection = selection;
      if (moveToEndOfLine && selection === undefined) {
        initialSelection = { anchor: (doc ?? initialValue)?.indexOf('\n') ?? 0 };
      }

      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      // NOTE: Don't set selection here in case it is invalid (and crashes the state); dispatch below.
      const state = EditorState.create({
        doc: doc ?? initialValue,
        selection: initialSelection,
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
        selection: initialSelection,
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
      // TODO(burdon): Set selection after first update (since content may rerender on focus)?
      if (scrollTo) {
        onUpdate.current = () => {
          onUpdate.current = undefined;
          view.dispatch({ effects: scrollTo && [scrollTo], scrollIntoView: !scrollTo });
        };
      }

      if (autoFocus) {
        view.focus();
      }
    }
  }, [view, autoFocus, selection, scrollTo]);

  const focusableGroup = useFocusableGroup({ tabBehavior: 'limited' });
  // Focus editor on Enter (e.g., when tabbing to this component).
  const handleKeyUp = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      const { key, target, currentTarget } = event;
      if (target === currentTarget) {
        switch (key) {
          case 'Enter': {
            view?.focus();
            break;
          }
        }
      }
    },
    [view],
  );

  const focusAttributes = { tabIndex: 0 as const, ...focusableGroup, onKeyUp: handleKeyUp };

  return { parentRef, view, focusAttributes };
};
