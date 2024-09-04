//
// Copyright 2024 DXOS.org
//

import { EditorState, type EditorStateConfig } from '@codemirror/state';
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
import { isNotFalsy, type MaybeFunction } from '@dxos/util';

import { createEditorStateTransaction, documentId, editorInputMode, type EditorSelection } from '../extensions';
import { logChanges } from '../util';

export type UseTextEditor = {
  parentRef: RefObject<HTMLDivElement>;
  view?: EditorView;
  focusAttributes: ReturnType<typeof useFocusableGroup> & {
    tabIndex: 0;
    onKeyUp: KeyboardEventHandler<HTMLDivElement>;
  };
};

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  length: number;
  after?: string;
};

export type UseTextEditorProps = Pick<EditorStateConfig, 'extensions'> & {
  id?: string;
  initialValue?: string;
  className?: string;
  autoFocus?: boolean;
  scrollTo?: number;
  selection?: EditorSelection;
  moveToEndOfLine?: boolean;
  debug?: boolean;
};

let instanceCount = 0;

/**
 * Hook for creating editor.
 */
export const useTextEditor = (
  props: MaybeFunction<UseTextEditorProps> = {},
  deps: DependencyList = [],
): UseTextEditor => {
  const { id, initialValue, extensions, autoFocus, scrollTo, selection, moveToEndOfLine, debug } =
    useMemo<UseTextEditorProps>(() => {
      return typeof props === 'function' ? props() : props;
    }, deps ?? []);

  // NOTE: Increments by 2 in strict mode.
  const [instanceId] = useState(() => `text-editor-${++instanceCount}`);
  // Callback once view is created.
  const onUpdate = useRef<() => void>();
  const [view, setView] = useState<EditorView>();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: EditorView;
    if (parentRef.current) {
      log('create', { id, instanceId, doc: initialValue?.length ?? 0 });

      let initialSelection;
      if (selection?.anchor && initialValue?.length) {
        if (selection.anchor <= initialValue.length && (selection?.head ?? 0) <= initialValue.length) {
          initialSelection = selection;
        }
      } else if (moveToEndOfLine && selection === undefined) {
        const index = initialValue?.indexOf('\n');
        const anchor = !index || index === -1 ? 0 : index;
        initialSelection = { anchor };
      }

      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      // NOTE: Don't set selection here in case it is invalid (and crashes the state); dispatch below.
      const state = EditorState.create({
        doc: initialValue,
        selection: initialSelection,
        extensions: [
          id && documentId.of(id),
          // NOTE: Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),
          extensions,
          EditorView.updateListener.of(() => {
            setTimeout(() => {
              onUpdate.current?.();
            });
          }),
        ].filter(isNotFalsy),
      });

      // https://codemirror.net/docs/ref/#view.EditorViewConfig
      view = new EditorView({
        parent: parentRef.current,
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

      // Move to end of line after document loaded.
      if (!initialValue && moveToEndOfLine) {
        const { to } = view.state.doc.lineAt(0);
        view.dispatch({ selection: { anchor: to } });
      }

      setView(view);
    }

    return () => {
      log('destroy', { id });
      view?.destroy();
    };
  }, deps);

  useEffect(() => {
    if (view) {
      // NOTE: Set selection after first update (since content may rerender on focus).
      onUpdate.current = () => {
        onUpdate.current = undefined;
        view.dispatch(createEditorStateTransaction({ scrollTo, selection }));
      };

      // Remove tabster attribute (rely on custom keymap).
      if (view.state.facet(editorInputMode).noTabster) {
        parentRef.current?.removeAttribute('data-tabster');
      }
    }
  }, [view, selection, scrollTo]);

  useEffect(() => {
    if (view && autoFocus) {
      view.focus();
    }
  }, [autoFocus, view]);

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
