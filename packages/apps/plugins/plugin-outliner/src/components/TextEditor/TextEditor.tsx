//
// Copyright 2023 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { placeholder, EditorView } from '@codemirror/view';
import React, {
  type KeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  type HTMLAttributes,
} from 'react';
import { yCollab } from 'y-codemirror.next';

import { useThemeContext } from '@dxos/react-ui';
import { type EditorModel, type EditorSlots } from '@dxos/react-ui-editor';
import { YText } from '@dxos/text-model';

import { markdownTheme } from './markdownTheme';

export type CursorInfo = {
  line: number;
  lines: number;
};

export type TextEditorProps = {
  model?: EditorModel;
  focus?: boolean;
  slots?: EditorSlots;
  onKeyDown?: (event: KeyboardEvent, info: CursorInfo) => void;
} & Pick<HTMLAttributes<HTMLDivElement>, 'onFocus' | 'onBlur'>;

export type TextEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ model, focus, slots = {}, onKeyDown, ...props }, forwardedRef) => {
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

    useEffect(() => {
      if (!parent) {
        return;
      }

      view?.destroy();

      const state = EditorState.create({
        doc: content?.toString(),
        extensions: [
          placeholder(slots.editor?.placeholder ?? ''),
          EditorView.lineWrapping,

          // Theme
          // markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }),
          EditorView.theme({ ...markdownTheme, ...slots.editor?.markdownTheme }),
          ...(themeMode === 'dark'
            ? [syntaxHighlighting(oneDarkHighlightStyle)]
            : [syntaxHighlighting(defaultHighlightStyle)]),
          // syntaxHighlighting(markdownDarkHighlighting),

          // Replication.
          ...(content instanceof YText ? [yCollab(content, undefined)] : []),
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

    return <div key={id} ref={setParent} {...slots.root} onKeyDown={handleKeyDown} {...props} />;
  },
);
