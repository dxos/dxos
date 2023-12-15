//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { vim } from '@replit/codemirror-vim';
import defaultsDeep from 'lodash.defaultsdeep';
import get from 'lodash.get';
import React, {
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ComponentProps,
} from 'react';

import { isDocAccessor } from '@dxos/echo-schema';
import { useThemeContext } from '@dxos/react-ui';

import { basicBundle, basicTheme, markdownBundle, markdownTheme } from './extensions';
import { type EditorModel, useCollaboration } from '../../hooks';
import type { ThemeStyles } from '../../styles';

export const EditorModes = ['default', 'vim'] as const;
export type EditorMode = (typeof EditorModes)[number];

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  after?: string;
};

export type TextEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

export type TextEditorSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
    placeholder?: string;
    spellCheck?: boolean;
    tabIndex?: number;
    theme?: ThemeStyles;
  };
};

export type TextEditorProps = {
  model: EditorModel;
  extensions?: Extension[];
  slots?: TextEditorSlots;
  editorMode?: EditorMode;
};

/**
 * Base text editor.
 * NOTE: Rather than adding properties, try to create extensions that can be reused.
 */
export const BaseTextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ model, extensions = [], slots, editorMode }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });

    const [parent, setParent] = useState<HTMLDivElement | null>(null);
    const [state, setState] = useState<EditorState>();
    const [view, setView] = useState<EditorView>();
    useImperativeHandle(
      forwardedRef,
      () => ({
        editor: parent,
        state,
        view,
      }),
      [view, state, parent],
    );

    // TODO(burdon): Pass in extension?
    const collaboration = useCollaboration(model, themeMode);

    useEffect(() => {
      if (!parent) {
        return;
      }

      const initialText = isDocAccessor(model.content)
        ? get(model.content.handle.docSync(), model.content.path)
        : model.content?.toString();

      const state = EditorState.create({
        doc: initialText,
        extensions: [
          // TODO(burdon): Factor out VIM mode?
          editorMode === 'vim' && vim(),

          // Replication.
          collaboration,

          // Theme.
          slots?.editor?.theme && EditorView.theme(slots?.editor?.theme),

          // Custom.
          ...extensions,
        ].filter(Boolean) as Extension[],
      });

      setState(state);

      // NOTE: This repaints the editor.
      // If the new state is derived from the old state, it will likely not be visible other than the cursor resetting.
      // Ideally this should not be hit except when changing between text objects.
      view?.destroy();
      setView(new EditorView({ state, parent }));

      return () => {
        view?.destroy();
        setView(undefined);
        setState(undefined);
      };
    }, [parent, model.content, themeMode, editorMode]);

    const handleKeyUp = useCallback(
      (event: KeyboardEvent) => {
        const { key, altKey, shiftKey, metaKey, ctrlKey } = event;
        switch (key) {
          case 'Enter': {
            view?.contentDOM.focus();
            break;
          }

          case 'Escape': {
            editorMode === 'vim' && (altKey || shiftKey || metaKey || ctrlKey) && parent?.focus();
            break;
          }
        }
      },
      [view, editorMode],
    );

    return (
      <div
        key={model.id}
        ref={setParent}
        tabIndex={0}
        {...slots?.root}
        {...(editorMode !== 'vim' && tabsterDOMAttribute)}
        onKeyUp={handleKeyUp}
      />
    );
  },
);

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ extensions: _extensions, slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const extensions = [...(_extensions ?? []), basicBundle({ themeMode, placeholder: slots?.editor?.placeholder })];
    return (
      <BaseTextEditor
        ref={forwardedRef}
        extensions={extensions}
        slots={defaultsDeep({}, slots, { editor: { theme: basicTheme } })}
        {...props}
      />
    );
  },
);

export const MarkdownEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ extensions: _extensions, slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const extensions = [...(_extensions ?? []), markdownBundle({ themeMode })];
    return (
      <BaseTextEditor
        ref={forwardedRef}
        extensions={extensions}
        slots={defaultsDeep({}, slots, { editor: { theme: markdownTheme } })}
        {...props}
      />
    );
  },
);
