//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { vim } from '@replit/codemirror-vim';
import React, {
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ComponentProps,
} from 'react';

import { useThemeContext } from '@dxos/react-ui';

import { basicBundle, markdownBundle } from './extensions';
import { type EditorModel, useCollaboration } from '../../hooks';
import type { ThemeStyles } from '../../styles';

export const EditorModes = ['default', 'vim'] as const;
export type EditorMode = (typeof EditorModes)[number];

export type EditorSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
    placeholder?: string;
    spellCheck?: boolean;
    tabIndex?: number;
    theme?: ThemeStyles;
  };
};

export type MarkdownEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

export type MarkdownEditorProps = {
  model: EditorModel;
  extensions?: Extension[];
  slots?: EditorSlots;
  editorMode?: EditorMode;
};

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ model, extensions = [], slots = {}, editorMode }, forwardedRef) => {
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

    // TODO(burdon): Pass in.
    const { content } = model;
    const collaboration = useCollaboration(model, themeMode);

    useEffect(() => {
      if (!parent) {
        return;
      }

      const state = EditorState.create({
        doc: content?.toString(),
        extensions: [
          basicBundle({ placeholder: slots?.editor?.placeholder }),
          markdownBundle({ themeMode }),

          // Theme.
          slots?.editor?.theme && EditorView.theme(slots.editor.theme),

          // Settings.
          editorMode === 'vim' && vim(),

          // Replication.
          collaboration,

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
    }, [parent, content, themeMode, editorMode]);

    // TODO(burdon): Create extension with listener.
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

    // export type CursorInfo = {
    //   from: number;
    //   to: number;
    //   line: number;
    //   lines: number;
    //   after?: string;
    // };

    // const handleKeyDown = useCallback(
    //   (event: KeyboardEvent) => {
    //     if (view) {
    //       const { head, from, to } = view.state.selection.ranges[0];
    //       const { number } = view.state.doc.lineAt(head);
    //       const after = view.state.sliceDoc(from);
    //       onKeyDown?.(event, { from, to, line: number, lines: view.state.doc.lines, after });
    //     }
    //   },
    //   [view],
    // );

    return (
      <div
        key={model.id}
        ref={setParent}
        tabIndex={0}
        {...slots.root}
        {...(editorMode !== 'vim' ? tabsterDOMAttribute : {})}
        onKeyUp={handleKeyUp}
        // onKeyDown={handleKeyDown}
      />
    );
  },
);
