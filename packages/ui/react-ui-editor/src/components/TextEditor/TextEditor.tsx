//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { vim } from '@replit/codemirror-vim';
import defaultsDeep from 'lodash.defaultsdeep';
import React, {
  type ComponentProps,
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';
import { inputSurface, mx } from '@dxos/react-ui-theme';

import { basicBundle, markdownBundle, useAwareness } from '../../extensions';
import { type EditorModel } from '../../hooks';
import { type ThemeStyles } from '../../styles';
import { defaultTheme, markdownTheme, textTheme } from '../../themes';
import { logChanges } from '../../util';

// TODO(burdon): Change to enum?
export const EditorModes = ['default', 'vim'] as const;
export type EditorMode = (typeof EditorModes)[number];

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
  model: EditorModel;
  readonly?: boolean; // TODO(burdon): Move into model.
  autofocus?: boolean;
  multiline?: boolean;
  scrollTo?: StateEffect<any>; // TODO(burdon): Restore scroll position: scrollTo EditorView.scrollSnapshot().
  selection?: { anchor: number; head?: number };
  editorMode?: EditorMode; // TODO(burdon): Factor out.
  placeholder?: string;
  theme?: ThemeStyles;
  slots?: TextEditorSlots;
  extensions?: Extension[];
  debug?: boolean;
};

/**
 * Base text editor.
 */
export const BaseTextEditor = forwardRef<EditorView, TextEditorProps>(
  (
    {
      model,
      readonly,
      autofocus,
      scrollTo,
      selection,
      editorMode,
      theme,
      slots = defaultSlots,
      extensions = [],
      debug,
    },
    forwardedRef,
  ) => {
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const { themeMode } = useThemeContext();

    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    // The view ref can be used to focus the editor.
    // NOTE: This does not cause the parent to re-render, so the ref is not available immediately.
    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    // Set focus.
    useEffect(() => {
      if (autofocus) {
        view?.focus();
      }
    }, [view, autofocus]);

    // Monitor awareness.
    useAwareness(model);

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
          EditorState.readOnly.of(!!readonly),

          // Storage and replication.
          // NOTE: This must come before user extensions.
          model.extension,

          // TODO(burdon): Factor out (requires special handling for Escape/focus).
          editorMode === 'vim' && vim(),

          // Custom.
          ...extensions,
        ].filter(Boolean) as Extension[],
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
    }, [rootRef, model, readonly, editorMode, themeMode]);

    // Handles tab/focus.
    // Pressing Escape focuses the outer div (to support tab navigation); pressing Enter refocuses the editor.
    const handleKeyUp = useCallback(
      (event: KeyboardEvent) => {
        const { key, altKey, shiftKey, metaKey, ctrlKey } = event;
        switch (key) {
          case 'Enter': {
            view?.focus();
            break;
          }

          case 'Escape': {
            if (editorMode === 'vim' && (altKey || shiftKey || metaKey || ctrlKey)) {
              rootRef.current?.focus();
            }
            break;
          }
        }
      },
      [view, editorMode],
    );

    return (
      <div
        key={model.id}
        role='none'
        tabIndex={0}
        onKeyUp={handleKeyUp}
        {...slots.root}
        {...(editorMode !== 'vim' && tabsterDOMAttribute)}
        ref={rootRef}
      />
    );
  },
);

// TODO(burdon): Single-line/scroll.
export const TextEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, placeholder, multiline, theme = textTheme, slots, extensions = [], ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultTextSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[basicBundle({ themeMode, placeholder, multiline }), ...extensions]}
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
        extensions={[markdownBundle({ themeMode, readonly, placeholder }), ...extensions]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

export const defaultSlots: TextEditorSlots = {
  root: {
    // TODO(burdon): Add focusRing by default/as property?
    className: mx('flex flex-col grow overflow-y-auto', inputSurface),
  },
  editor: {
    className: 'h-full p-2',
  },
};

export const defaultTextSlots: TextEditorSlots = {
  ...defaultSlots,
};

export const defaultMarkdownSlots: TextEditorSlots = {
  ...defaultSlots,
};
