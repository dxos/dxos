//
// Copyright 2024 DXOS.org
//

import { EditorState, type EditorStateConfig, StateEffect, type Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  type ComponentPropsWithoutRef,
  type DependencyList,
  type KeyboardEventHandler,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import {
  type EditorSelection,
  type EditorSelectionState,
  debugDispatcher,
  documentId,
  modalStateField,
  restoreEditorState,
} from '@dxos/ui-editor';
import { type MaybeProvider, getProviderValue, isTruthy } from '@dxos/util';

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
  parentRef: RefObject<HTMLDivElement | null>;
  view: EditorView | null;
  focusAttributes?: ComponentPropsWithoutRef<'div'>;
};

export type UseTextEditorProps = Pick<EditorStateConfig, 'extensions'> & {
  id?: string;
  doc?: Text;
  initialValue?: string;
  autoFocus?: boolean;
  scrollTo?: number;
  scrollOffset?: number;
  selection?: EditorSelection;
  selectionEnd?: boolean;
  debug?: boolean;
};

/** The parts of a saved state that fit the document: one that shrank while closed keeps its scroll or its selection. */
const fitting = ({ scrollTo, scrollOffset, selection }: EditorSelectionState, length: number) => {
  const scrolls = scrollTo != null && scrollTo <= length;
  const selects = selection !== undefined && selection.anchor <= length && (selection.head ?? 0) <= length;
  return scrolls || selects
    ? {
        scrollTo: scrolls ? scrollTo : undefined,
        scrollOffset: scrolls ? scrollOffset : undefined,
        selection: selects ? selection : undefined,
      }
    : undefined;
};

/**
 * Creates codemirror text editor.
 */
export const useTextEditor = (
  props: MaybeProvider<UseTextEditorProps> = {},
  deps: DependencyList = [],
): UseTextEditor => {
  const { id, doc, initialValue, extensions, autoFocus, scrollTo, scrollOffset, selection, selectionEnd, debug } =
    useMemo<UseTextEditorProps>(() => getProviderValue(props), deps ?? []);

  // NOTE: Increments by 2 in strict mode.
  const [instanceId] = useState(() => `text-editor-${++instanceCount}`);
  const [view, setView] = useState<EditorView | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Layout effect, not a passive one: the view is what fills the editor's box, so building it after
  // the browser paints shows a frame of empty container and then reflows everything below it — a
  // field in a pane (a task's description) drops its siblings by the editor's height on every
  // subject change. Constructing before paint costs that work in the commit instead; see PERF.md in
  // `react-ui-markdown/src/MarkdownEditable` for what that costs on a large document.
  useLayoutEffect(() => {
    let view: EditorView | null = null;
    if (parentRef.current) {
      log('create', { id, instanceId, doc: initialValue?.length ?? 0 });

      // Only records whether an explicit selection governs, so that `selectionEnd` defers to it; the
      // effect below applies it. `!== undefined`, since an explicit `{ anchor: 0 }` is a selection.
      const length = (doc ?? initialValue)?.length ?? 0;
      let initialSelection;
      if (selection?.anchor !== undefined && length) {
        if (selection.anchor <= length && (selection?.head ?? 0) <= length) {
          initialSelection = selection;
        }
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
        dispatchTransactions: debug ? debugDispatcher : undefined,
      });

      // Move to end of line after document loaded (unless selection is specified).
      if (selectionEnd && !initialSelection) {
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

  useLayoutEffect(() => {
    if (!view || (scrollTo == null && !selection)) {
      return;
    }

    // Restored part by part as the document grows to hold it: a bound editor is created before its content arrives (the
    // automerge binding fills the document on attach, possibly over several updates), and a restore against a document
    // too short for it would be dropped.
    let remaining: EditorSelectionState | undefined = { scrollTo, scrollOffset, selection };
    const restore = (target: EditorView, length: number) => {
      const restorable = remaining && fitting(remaining, length);
      if (!remaining || !restorable) {
        return;
      }
      restoreEditorState(target, restorable);
      const scrolled = restorable.scrollTo !== undefined;
      const rest = {
        scrollTo: scrolled ? undefined : remaining.scrollTo,
        scrollOffset: scrolled ? undefined : remaining.scrollOffset,
        selection: restorable.selection ? undefined : remaining.selection,
      };
      remaining = rest.scrollTo != null || rest.selection ? rest : undefined;
    };

    restore(view, view.state.doc.length);
    if (!remaining) {
      return;
    }

    let active = true;
    view.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.updateListener.of((update) => {
          if (remaining && update.docChanged) {
            // A view cannot be dispatched to from within its own update.
            queueMicrotask(() => {
              if (active) {
                restore(update.view, update.view.state.doc.length);
              }
            });
          }
        }),
      ),
    });

    return () => {
      active = false;
    };
  }, [view, scrollTo, scrollOffset, selection]);

  useEffect(() => {
    // Focus in an open menu or listbox is the user's, and taking it would dismiss that popup.
    if (view && autoFocus && !view.dom.ownerDocument.activeElement?.closest('[role="menu"], [role="listbox"]')) {
      view.focus();
    }
  }, [autoFocus, view]);

  // Focus editor on Enter (e.g., when tabbing to this component).
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      const { key, target, currentTarget } = event;
      switch (key) {
        case 'Escape': {
          // Check if popover is open.
          const modal = view?.state.field(modalStateField, false);
          // A key CodeMirror already acted on (closing its completion list, cancelling dictation) stays in the editor.
          if (modal || event.defaultPrevented) {
            return;
          }

          // Focus the closest focusable parent.
          const element = view?.contentDOM.closest('[tabindex="0"]') as HTMLDivElement | null;
          element?.focus();
          break;
        }

        case 'Enter': {
          event.preventDefault();
          if (target === currentTarget) {
            view?.focus();
          }
          break;
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
      onKeyDown: handleKeyDown,
    },
  };
};
