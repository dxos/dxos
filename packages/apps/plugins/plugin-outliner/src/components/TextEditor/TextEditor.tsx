//
// Copyright 2023 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState, type Text } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { keymap, placeholder, EditorView } from '@codemirror/view';
import React, { type KeyboardEvent, forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { type EditorModel, type EditorSlots } from '@dxos/react-ui-editor';

// import { markdownTagsExtension } from './markdownTags';
import { markdownTheme } from './markdownTheme';

export type CursorInfo = {
  line: number;
  lines: number;
};

export type TextEditorProps = {
  model?: EditorModel;
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
  ({ model, slots = {}, onChange, onKeyDown }, forwardedRef) => {
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
      if (!parent) {
        return;
      }

      const state = EditorState.create({
        doc: content?.toString(),
        extensions: [
          // Based on https://github.com/codemirror/dev/issues/44#issuecomment-789093799.
          // listenChangesExtension,

          // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
          // highlightActiveLineGutter(),
          // highlightSpecialChars(),
          // history(),
          // drawSelection(),
          // dropCursor(),
          // EditorState.allowMultipleSelections.of(true),
          // indentOnInput(),
          // syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          // bracketMatching(),
          // closeBrackets(),
          // autocompletion({
          // activateOnTyping: true,
          // }),
          // rectangularSelection(),
          // crosshairCursor(),
          // highlightActiveLine(),
          // highlightSelectionMatches(),
          placeholder(slots.editor?.placeholder ?? 'Enter text...'), // TODO(burdon): Needs consistent styling.
          keymap.of([
            // ...closeBracketsKeymap,
            // ...defaultKeymap,
            // ...searchKeymap,
            // ...historyKeymap,
            // ...foldKeymap,
            // ...completionKeymap,
            // ...lintKeymap,
          ]),
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

    return <div key={id} {...slots.root} onKeyDown={handleKeyDown} ref={setParent} />;
  },
);
