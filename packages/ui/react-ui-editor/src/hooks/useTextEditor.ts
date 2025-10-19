//
// Copyright 2024 DXOS.org
//

import { EditorState, type EditorStateConfig, type Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type TabsterTypes, useFocusableGroup } from '@fluentui/react-tabster';
import {
  type ComponentPropsWithoutRef,
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
import { type MaybeProvider, getProviderValue, isTruthy } from '@dxos/util';

import { type EditorSelection, createEditorStateTransaction, documentId, editorInputMode } from '../extensions';
import { debugDispatcher } from '../util';

let instanceCount = 0;

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  length: number;
  after?: string;
};

export type UseTextEditor = {
  // TODO(burdon): Rename.
  parentRef: RefObject<HTMLDivElement | null>;
  view: EditorView | null;
  focusAttributes?: TabsterTypes.TabsterDOMAttribute & ComponentPropsWithoutRef<'div'>;
};

export type UseTextEditorProps = Pick<EditorStateConfig, 'extensions'> & {
  id?: string;
  doc?: Text;
  initialValue?: string;
  autoFocus?: boolean;
  scrollTo?: number;
  selection?: EditorSelection;
  moveToEndOfLine?: boolean;
  debug?: boolean;
};

/**
 * Creates codemirror text editor.
 */
export const useTextEditor = (
  props: MaybeProvider<UseTextEditorProps> = {},
  deps: DependencyList = [],
): UseTextEditor => {
  const { id, doc, initialValue, extensions, autoFocus, scrollTo, selection, moveToEndOfLine, debug } =
    useMemo<UseTextEditorProps>(() => getProviderValue(props), deps ?? []);

  // NOTE: Increments by 2 in strict mode.
  const [instanceId] = useState(() => `text-editor-${++instanceCount}`);
  const [view, setView] = useState<EditorView | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let view: EditorView | null = null;
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
        doc: doc ?? initialValue,
        // selection: initialSelection,
        extensions: [
          id && documentId.of(id),
          extensions,
          // NOTE: This doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),
        ].filter(isTruthy),
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

  //
  const focusableGroupAttrs = useFocusableGroup({
    tabBehavior: 'limited',
    ignoreDefaultKeydown: {
      Escape: view?.state.facet(editorInputMode).ignoreEscape,
    },
  });

  // Focus editor on Enter (e.g., when tabbing to this component).
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      const { key, target, currentTarget } = event;
      if (target === currentTarget) {
        switch (key) {
          case 'Enter': {
            view?.focus();
            break;
          }
          case 'Escape': {
            console.log('[use text editor]', 'keyup', 'escape');
            break;
          }
        }
      }
    },
    [view],
  );

  return {
    parentRef,
    view,
    focusAttributes: {
      tabIndex: 0 as const,
      ...focusableGroupAttrs,
      onKeyDown: handleKeyDown,
    },
  };
};
