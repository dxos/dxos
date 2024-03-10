//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView, scrollPastEnd } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import defaultsDeep from 'lodash.defaultsdeep';
import React, {
  type ComponentProps,
  type KeyboardEventHandler,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DocAccessor } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';
import { focusRing } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { createMarkdownExtensions, editorMode } from '../../extensions';
import { type EditorModel } from '../../hooks';
import { type ThemeStyles } from '../../styles';
import { defaultTheme, markdownTheme } from '../../themes';
import { logChanges } from '../../util';

// TODO(burdon): GOAL: Remove EditorModel/useTextModel.
//  - Create single wrapper component.
//  - Remove useEditorView.
//  - Clean-up extension creators.
//  - Factor out and rename DocAccessor (remove echo-schema dep).

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  length: number;
  after?: string;
};

export type TextEditorSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
  };
  content?: {
    className?: string;
  };
};

/**
 * @deprecated
 */
export const defaultSlots: TextEditorSlots = {
  root: {
    className: focusRing,
  },
  editor: {
    className: 'bs-full',
  },
};

/**
 * @deprecated
 */
export type BaseTextEditorProps = Omit<TextEditorProps, 'doc' | 'className'> & {
  model: EditorModel;
  readonly?: boolean;
  scrollPastEnd?: boolean;
  lineWrapping?: boolean;
  placeholder?: string;
  theme?: ThemeStyles;
  slots?: TextEditorSlots;
};

/**
 * @deprecated
 */
export const MarkdownEditor = forwardRef<EditorView | null, BaseTextEditorProps>(
  ({ readonly, placeholder, theme = markdownTheme, slots, extensions: _extensions, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultSlots);
    const extensions = useMemo(
      () => [createMarkdownExtensions({ themeMode, placeholder }), ...(_extensions ?? [])],
      [themeMode, placeholder, _extensions],
    );

    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={extensions}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

/**
 * @deprecated
 */
const BaseTextEditor = forwardRef<EditorView | null, BaseTextEditorProps>(
  (
    {
      model,
      readonly,
      autoFocus,
      scrollTo = EditorView.scrollIntoView(0),
      moveToEndOfLine,
      selection,
      theme,
      slots = defaultSlots,
      extensions = [],
      scrollPastEnd: _scrollPastEnd,
      debug,
    },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    // The view ref can be used to focus the editor.
    // NOTE: This does not cause the parent to re-render, so the ref is not available immediately.
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
      invariant(rootRef.current);
      if (!model) {
        return;
      }

      //
      // EditorState
      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      //
      const state = EditorState.create({
        doc: typeof model.content === 'string' ? model.content : DocAccessor.getValue(model.content),
        selection,
        extensions: [
          // TODO(burdon): Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),

          // Theme.
          // TODO(burdon): Make base theme configurable.
          EditorView.baseTheme(defaultTheme),
          theme && EditorView.theme(theme),
          EditorView.darkTheme.of(themeMode === 'dark'),
          slots.editor?.className && EditorView.editorAttributes.of({ class: slots.editor.className }),
          slots.content?.className && EditorView.contentAttributes.of({ class: slots.content.className }),

          // NOTE: Assumes default line height.
          _scrollPastEnd && scrollPastEnd(),

          // Focus.
          EditorView.updateListener.of((update) => {
            update.transactions.forEach((transaction) => {
              if (transaction.isUserEvent('focus.container')) {
                rootRef.current?.focus();
              }
            });
          }),

          // State.
          EditorView.editable.of(!readonly),
          EditorState.readOnly.of(!!readonly),

          // Storage and replication.
          // NOTE: This must come before user extensions.
          model.extension,

          // Custom.
          ...extensions,
        ].filter(isNotFalsy),
      });

      //
      // EditorView
      // https://codemirror.net/docs/ref/#view.EditorViewConfig
      //
      const view = new EditorView({
        state,
        parent: rootRef.current,
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

      if (moveToEndOfLine) {
        const { to } = view.state.doc.lineAt(0);
        view?.dispatch({ selection: { anchor: to } });
      }

      // Remove tabster attribute (rely on custom keymap).
      if (state.facet(editorMode).noTabster) {
        rootRef.current.removeAttribute('data-tabster');
      }

      return () => {
        view?.destroy();
        setView(null);
      };
    }, [extensions, model, readonly, themeMode]);

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
        key={model.id} // TODO(burdon): Remove?
        tabIndex={0}
        onKeyUp={handleKeyUp}
        {...slots.root}
        {...tabsterDOMAttribute}
      />
    );
  },
);

export type TextEditorProps = {
  doc?: string; // TODO(burdon): Rename text/value?
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
      log.info('updating view', { doc, selection, scrollTo, extensions: extensions.length });

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
