//
// Copyright 2023 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState, StateField, type Text } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { placeholder, EditorView } from '@codemirror/view';
import React, {
  type KeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useMemo,
} from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { type EditorModel, type EditorSlots } from '@dxos/react-ui-editor';

import { markdownTheme } from './markdownTheme';

export type CursorInfo = {
  line: number;
  lines: number;
};

export type TextEditorProps = {
  model?: EditorModel;
  focus?: boolean;
  slots?: EditorSlots;
  onChange?: (content: string | Text) => void;
  onKeyDown?: (event: KeyboardEvent, info: CursorInfo) => void;
};

export type TextEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ model, focus, slots = {}, onChange, onKeyDown }, forwardedRef) => {
    const { id, content } = model ?? {};
    const { themeMode } = useThemeContext();

    const [parent, setParent] = useState<HTMLDivElement | null>(null);
    const [state, setState] = useState<EditorState>();
    const [view, setView] = useState<EditorView>();
    useImperativeHandle(forwardedRef, () => ({
      editor: parent,
      state,
      view,
    }));

    useEffect(() => {
      if (focus) {
        view?.focus();
      }
    }, [view, focus]);

    const listenChangesExtension = useMemo(
      () =>
        StateField.define({
          create: () => null,
          update: (_value, transaction) => {
            if (transaction.docChanged && onChange) {
              onChange(transaction.newDoc);
            }
            return null;
          },
        }),
      [onChange],
    );

    useEffect(() => {
      if (!parent) {
        return;
      }

      view?.destroy();

      const state = EditorState.create({
        doc: content?.toString(),
        extensions: [
          // Based on https://github.com/codemirror/dev/issues/44#issuecomment-789093799.
          listenChangesExtension,

          placeholder(slots.editor?.placeholder ?? ''),
          EditorView.lineWrapping,

          // Theme
          // markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }),
          EditorView.theme({ ...markdownTheme, ...slots.editor?.markdownTheme }),
          ...(themeMode === 'dark'
            ? [syntaxHighlighting(oneDarkHighlightStyle)]
            : [syntaxHighlighting(defaultHighlightStyle)]),
          // syntaxHighlighting(markdownDarkHighlighting),
        ],
      });

      setState(state);
      setView(new EditorView({ state, parent }));

      return () => {
        view?.destroy();
        setView(undefined);
        setState(undefined);
      };
    }, [parent, content, themeMode]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (view) {
          const head = view.state.selection.ranges[0].head;
          const current = view.state.doc.lineAt(head);
          onKeyDown?.(event, { line: current.number, lines: view.state.doc.lines });
        }
      },
      [view],
    );

    return <div key={id} ref={setParent} {...slots.root} onKeyDown={handleKeyDown} />;
  },
);
