//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
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
  autofocus?: boolean;
  readonly?: boolean; // TODO(burdon): Move into model.
  selection?: { anchor: number; head?: number };
  extensions?: Extension[];
  editorMode?: EditorMode;
  placeholder?: string;
  theme?: ThemeStyles;
  slots?: TextEditorSlots;
};

/**
 * Base text editor.
 */
export const BaseTextEditor = forwardRef<EditorView, TextEditorProps>(
  (
    { model, autofocus, readonly, selection, extensions = [], editorMode, theme, slots = defaultSlots },
    forwardedRef,
  ) => {
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const { themeMode } = useThemeContext();

    // The editor view ref should only be used as an escape hatch.
    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);
    // NOTE: This does not cause the parent to re-render, so the ref is not available immediately.
    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    useEffect(() => {
      if (autofocus) {
        view?.focus();
      }
    }, [view, autofocus]);

    useAwareness(model);

    useEffect(() => {
      if (!model || !rootRef.current) {
        return;
      }

      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      const state = EditorState.create({
        doc: model.text(),
        // TODO(burdon): Set stored selection/scroll position when switching documents.
        selection,
        extensions: [
          EditorState.readOnly.of(!!readonly),

          // TODO(burdon): Doesn't catch errors in keymap functions.
          EditorView.exceptionSink.of((err) => {
            log.catch(err);
          }),

          // Theme.
          // TODO(burdon): Make theme configurable.
          EditorView.baseTheme(defaultTheme),
          EditorView.theme(theme ?? {}),
          EditorView.darkTheme.of(themeMode === 'dark'),
          EditorView.editorAttributes.of({ class: slots.editor?.className ?? '' }),
          EditorView.contentAttributes.of({ class: slots.content?.className ?? '' }),

          // TODO(burdon): Factor out VIM mode? (manage via MarkdownPlugin).
          editorMode === 'vim' && vim(),

          // Storage and replication.
          model.extension,

          // Custom.
          ...extensions,
        ].filter(Boolean) as Extension[],
      });

      // NOTE: This repaints the editor.
      // If the new state is derived from the old state, it will likely not be visible other than the cursor resetting.
      // Ideally this should not happen except when changing between text objects.
      view?.destroy();
      const newView = new EditorView({
        parent: rootRef.current,
        state,
        // NOTE: Uncomment to debug/monitor all transactions.
        // https://codemirror.net/docs/ref/#view.EditorView.dispatch
        // dispatch: (transaction, view) => {
        //   view.update([transaction]);
        // },
      });

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

export const TextEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, placeholder, extensions = [], theme = textTheme, slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultTextSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[basicBundle({ readonly, themeMode, placeholder }), ...extensions]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

// TODO(burdon): Remove (Just provide bundle, slots).
export const MarkdownEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, placeholder, extensions = [], theme = markdownTheme, slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultMarkdownSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[markdownBundle({ readonly, themeMode, placeholder }), ...extensions]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

export const defaultSlots: TextEditorSlots = {
  root: {
    className: mx('w-full h-full overflow-y-auto p-4', inputSurface),
  },
};

export const defaultTextSlots: TextEditorSlots = {
  ...defaultSlots,
};

export const defaultMarkdownSlots: TextEditorSlots = {
  ...defaultSlots,
};
