//
// Copyright 2023 DXOS.org
//

import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView, placeholder } from '@codemirror/view';
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
import { YText } from '@dxos/text-model';

import { theme } from './theme';
import { type EditorModel, type EditorSlots } from '../../model';

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  after?: string;
};

export type TextEditorProps = {
  model?: EditorModel;
  slots?: EditorSlots;
  onKeyDown?: (event: KeyboardEvent, info: CursorInfo) => void;
} & Pick<HTMLAttributes<HTMLDivElement>, 'onBlur' | 'onFocus'>;

export type TextEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

/**
 * Simple text editor.
 */
export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ model, slots = {}, onKeyDown, ...props }, forwardedRef) => {
    const { id, content } = model ?? {};
    const { themeMode } = useThemeContext();

    const [parent, setParent] = useState<HTMLDivElement | null>(null);
    const [state, setState] = useState<EditorState>();
    const [view, setView] = useState<EditorView>();

    // TODO(burdon): The ref may be instantiated before the view is created.
    useImperativeHandle(
      forwardedRef,
      () => {
        return {
          editor: parent,
          state,
          view,
        };
      },
      [view],
    );

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
          EditorView.theme(theme),
          ...(themeMode === 'dark'
            ? [syntaxHighlighting(oneDarkHighlightStyle)]
            : [syntaxHighlighting(defaultHighlightStyle)]),

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
          const { head, from, to } = view.state.selection.ranges[0];
          const { number } = view.state.doc.lineAt(head);
          const after = view.state.sliceDoc(from);
          onKeyDown?.(event, { from, to, line: number, lines: view.state.doc.lines, after });
        }
      },
      [view],
    );

    return <div key={id} ref={setParent} {...slots.root} onKeyDown={handleKeyDown} {...props} />;
  },
);
