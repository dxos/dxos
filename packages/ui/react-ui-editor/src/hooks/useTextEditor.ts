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
import { getProviderValue, isNotFalsy, type MaybeProvider } from '@dxos/util';

import { editorInputMode, type EditorSelection, documentId, createEditorStateTransaction } from '../extensions';
import { debugDispatcher } from '../util';

export type UseTextEditor = {
  // TODO(burdon): Rename.
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
  props: MaybeProvider<UseTextEditorProps> = {},
  deps: DependencyList = [],
): UseTextEditor => {
  const { id, initialValue, extensions, autoFocus, scrollTo, selection, moveToEndOfLine, debug } =
    useMemo<UseTextEditorProps>(() => getProviderValue(props), deps ?? []);

  // NOTE: Increments by 2 in strict mode.
  const [instanceId] = useState(() => `text-editor-${++instanceCount}`);
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
      const state = EditorState.create({
        doc: initialValue,
        // selection: initialSelection,
        extensions: [
          id && documentId.of(id),
          extensions,
          // NOTE: This doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),
          // TODO(burdon): Factor out debug inspector.
          // ViewPlugin.fromClass(
          //   class {
          //     constructor(_view: EditorView) {
          //       log('construct', { id });
          //     }
          //
          //     destroy() {
          //       log('destroy', { id });
          //     }
          //   },
          // ),
        ].filter(isNotFalsy),
      });

      // https://codemirror.net/docs/ref/#view.EditorViewConfig
      view = new EditorView({
        parent: parentRef.current,
        state,
        scrollTo: scrollTo ? EditorView.scrollIntoView(scrollTo, { yMargin: 96 }) : undefined, // TODO(burdon): Const.
        dispatchTransactions: debug ? debugDispatcher : undefined,
      });

      // Move to end of line after document loaded (unless selection is specified).
      if (moveToEndOfLine && !initialSelection) {
        const { to } = view.state.doc.lineAt(0);
        if (to) {
          view.dispatch({ selection: { anchor: to } });
        }
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
      if (scrollTo || selection) {
        if (selection && selection.anchor > view.state.doc.length) {
          log.warn('invalid selection', { length: view.state.doc.length, scrollTo, selection });
          return;
        }

        view.dispatch(createEditorStateTransaction({ scrollTo, selection }));
      }
    }
  }, [view, scrollTo, selection]);

  useEffect(() => {
    if (view && autoFocus) {
      view.focus();
    }
  }, [autoFocus, view]);

  const focusableGroup = useFocusableGroup({
    tabBehavior: 'limited',
    ignoreDefaultKeydown: { Escape: view?.state.facet(editorInputMode).noTabster },
  });

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
