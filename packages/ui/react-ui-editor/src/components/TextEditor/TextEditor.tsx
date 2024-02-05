//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import defaultsDeep from 'lodash.defaultsdeep';
import React, {
  type ComponentProps,
  forwardRef,
  type KeyboardEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';
import { focusRing, mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { createBasicBundle, createMarkdownExtensions } from '../../extensions';
import { type EditorModel } from '../../hooks';
import { type ThemeStyles } from '../../styles';
import { defaultTheme, markdownTheme, textTheme } from '../../themes';
import { logChanges } from '../../util';

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

// TODO(burdon): Spellcheck?
export type TextEditorProps = {
  model: EditorModel; // TODO(burdon): Optional (e.g., just provide content if readonly).
  readonly?: boolean; // TODO(burdon): Move into model.
  autoFocus?: boolean;
  lineWrapping?: boolean;
  scrollTo?: StateEffect<any>; // TODO(burdon): Restore scroll position: scrollTo EditorView.scrollSnapshot().
  selection?: { anchor: number; head?: number };
  placeholder?: string;
  theme?: ThemeStyles;
  slots?: TextEditorSlots;
  extensions?: Extension[];
  debug?: boolean;
};

/**
 * Base text editor.
 */
// TODO(burdon): Replace with useTextEditor.
export const BaseTextEditor = forwardRef<EditorView, TextEditorProps>(
  (
    { model, readonly, autoFocus, scrollTo, selection, theme, slots = defaultSlots, extensions = [], debug },
    forwardedRef,
  ) => {
    // TODO(burdon): Hook causes error even if properties are not spread into div.
    //  Uncaught TypeError: Cannot read properties of undefined (reading 'relatedTarget')
    //  Uses event.detail, which is deprecated (not event.details). At runtime the event has a property `details`.
    //  https://github.com/microsoft/tabster/blob/master/src/State/FocusedElement.ts#L348 (e.detail.relatedTarget)
    //  https://github.com/microsoft/keyborg/blob/49e49b2c3ba0a5f6cc518ac46825d7551def8109/src/FocusEvent.ts#L58
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const { themeMode } = useThemeContext();

    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    // The view ref can be used to focus the editor.
    // NOTE: This does not cause the parent to re-render, so the ref is not available immediately.
    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    // Set focus.
    useEffect(() => {
      if (autoFocus && !view?.hasFocus) {
        if (view?.state.selection.main?.from === 0) {
          // Start at end of line.
          const { to } = view.state.doc.lineAt(0);
          view?.dispatch({ selection: { anchor: to } });
        }
        view?.focus();
      }
    }, [view, autoFocus]);

    // Create editor state and view.
    // The view is recreated if the model or extensions are changed.
    useEffect(() => {
      if (!model || !rootRef.current) {
        return;
      }

      //
      // EditorState
      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      //
      const state = EditorState.create({
        doc: model.text(),
        selection,
        extensions: [
          // TODO(burdon): Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),

          // Theme.
          // TODO(burdon): Make configurable.
          EditorView.baseTheme(defaultTheme),
          EditorView.theme(theme ?? {}),
          EditorView.darkTheme.of(themeMode === 'dark'),
          EditorView.editorAttributes.of({ class: slots.editor?.className ?? '' }),
          EditorView.contentAttributes.of({ class: slots.content?.className ?? '' }),

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
      const newView = new EditorView({
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

      view?.destroy();
      setView(newView);

      return () => {
        newView?.destroy();
        setView(null);
      };
    }, [rootRef, model, readonly, themeMode]);

    // Pressing Escape focuses the outer div (to support tab navigation). Pressing Enter should refocus the editor.
    // In vim-mode, press a key modifier to focus the outer div.
    const handleKeyUp = useCallback<KeyboardEventHandler<HTMLDivElement>>(
      (event) => {
        const { key, altKey, shiftKey, metaKey, ctrlKey } = event;
        switch (key) {
          case 'Enter': {
            view?.focus();
            break;
          }
          case 'Escape': {
            if (altKey || shiftKey || metaKey || ctrlKey) {
              rootRef.current?.focus();
              break;
            } else {
              view?.focus();
            }
            break;
          }
        }
      },
      [view],
    );

    return (
      <div
        key={model.id}
        role='none'
        tabIndex={0}
        {...slots.root}
        {...tabsterDOMAttribute}
        onKeyUp={handleKeyUp}
        ref={rootRef}
      />
    );
  },
);

export const TextEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, placeholder, lineWrapping, theme = textTheme, slots, extensions = [], ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultTextSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[createBasicBundle({ themeMode, placeholder, lineWrapping }), ...extensions]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

export const MarkdownEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, placeholder, theme = markdownTheme, slots, extensions = [], ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultMarkdownSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[createMarkdownExtensions({ themeMode, placeholder }), ...extensions]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

export const defaultSlots: TextEditorSlots = {
  root: {
    className: mx('grow', focusRing),
  },
  editor: {
    className: 'bs-full',
  },
};

export const defaultTextSlots: TextEditorSlots = {
  ...defaultSlots,
};

export const defaultMarkdownSlots: TextEditorSlots = {
  ...defaultSlots,
};
