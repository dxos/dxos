//
// Copyright 2023 DXOS.org
//

import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { lintKeymap } from '@codemirror/lint';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { EditorState, type Extension, StateField, type Text } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  keymap,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  placeholder,
  rectangularSelection,
  EditorView,
} from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { GFM } from '@lezer/markdown';
import { vim } from '@replit/codemirror-vim';
import React, {
  type KeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { yCollab } from 'y-codemirror.next';

import { generateName } from '@dxos/display-name';
import { useThemeContext } from '@dxos/react-ui';
import { getColorForValue } from '@dxos/react-ui-theme';
import { YText } from '@dxos/text-model';

import { markdownTagsExtension } from './markdownTags';
import { markdownHighlightStyle, markdownTheme } from './markdownTheme';
import { type EditorModel, type EditorSlots } from '../../model';

export const EditorModes = ['default', 'vim'] as const;
export type EditorMode = (typeof EditorModes)[number];

export type MarkdownEditorProps = {
  model: EditorModel;
  slots?: EditorSlots;
  editorMode?: EditorMode;
  showWidgets?: boolean;
  extensions?: Extension[];
  onChange?: (content: string | Text) => void;
};

export type MarkdownEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ model, slots = {}, editorMode, extensions = [], onChange }, forwardedRef) => {
    const { id, content, provider, peer } = model ?? {};
    const { themeMode } = useThemeContext();
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });

    const [parent, setParent] = useState<HTMLDivElement | null>(null);
    const [state, setState] = useState<EditorState>();
    const [view, setView] = useState<EditorView>();

    useImperativeHandle(forwardedRef, () => ({
      editor: parent,
      state,
      view,
    }));

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
      if (provider && peer) {
        provider.awareness.setLocalStateField('user', {
          name: peer.name ?? generateName(peer.id),
          color: getColorForValue({ value: peer.id, type: 'color' }),
          colorLight: getColorForValue({ value: peer.id, themeMode, type: 'highlight' }),
        });
      }
    }, [provider, peer, themeMode]);

    useEffect(() => {
      if (!parent) {
        return;
      }

      const state = EditorState.create({
        doc: content?.toString(),
        extensions: [
          // Based on https://github.com/codemirror/dev/issues/44#issuecomment-789093799.
          listenChangesExtension,

          // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
          // https://codemirror.net/docs/ref/#codemirror.basicSetup
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          placeholder(slots.editor?.placeholder ?? ''), // TODO(burdon): Needs consistent styling.
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
            indentWithTab,
          ]),
          EditorView.lineWrapping,

          // Main extension.
          // https://github.com/codemirror/lang-markdown
          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
            extensions: [
              // GitHub flavored markdown bundle: Table, TaskList, Strikethrough, and Autolink.
              // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
              GFM,

              // Custom styling.
              markdownTagsExtension,
            ],
          }),

          // Theme.
          EditorView.theme({ ...markdownTheme, ...slots.editor?.markdownTheme }),
          ...(themeMode === 'dark'
            ? [syntaxHighlighting(oneDarkHighlightStyle)]
            : [syntaxHighlighting(defaultHighlightStyle)]),

          // TODO(thure): All but one rule here apply to both themes; rename or refactor.
          syntaxHighlighting(markdownHighlightStyle),

          // Settings.
          ...(editorMode === 'vim' ? [vim()] : []),

          // Replication and awareness (incl. remote selection).
          // https://codemirror.net/docs/ref/#collab
          ...(content instanceof YText ? [yCollab(content, provider?.awareness)] : []),

          // Custom.
          ...extensions,
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
    }, [parent, content, provider?.awareness, themeMode, editorMode]);

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
        tabIndex={0}
        ref={setParent}
        key={id}
        {...slots.root}
        {...(editorMode !== 'vim' ? tabsterDOMAttribute : {})}
        onKeyUp={handleKeyUp}
      />
    );
  },
);
