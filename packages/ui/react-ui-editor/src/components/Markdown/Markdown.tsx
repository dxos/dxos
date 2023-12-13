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
import { EditorState, type Extension } from '@codemirror/state';
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
// import { GFM } from '@lezer/markdown';
import { vim } from '@replit/codemirror-vim';
import React, { type KeyboardEvent, forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';
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

export type MarkdownEditorRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

export type MarkdownEditorProps = {
  model: EditorModel;
  extensions?: Extension[];
  slots?: EditorSlots;
  // TODO(burdon): Move props to extensions.
  editorMode?: EditorMode;
  showWidgets?: boolean;
  // TODO(burdon): Factor out (move to extension).
  // onChange?: (content: string | Text) => void;
};

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ model, extensions = [], slots = {}, editorMode }, forwardedRef) => {
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

    // TODO(burdon): Factor out?
    // TODO(burdon): Why useMemo vs useCallback?
    // const onChangeExtension = useMemo(
    //   () =>
    //     StateField.define({
    //       create: () => null,
    //       update: (_value, transaction) => {
    //         if (transaction.docChanged && onChange) {
    //           onChange(transaction.newDoc);
    //         }
    //
    //         return null;
    //       },
    //     }),
    //   [onChange],
    // );

    // Presence/awareness.
    const { provider, peer, content } = model;
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
          // TODO(burdon): Create custom bundle to make this class more reusable and retire simpler TextEditor component.
          // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
          // https://codemirror.net/docs/ref/#codemirror.basicSetup
          autocompletion(),
          bracketMatching(),
          closeBrackets(),
          crosshairCursor(),
          dropCursor(),
          drawSelection(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          highlightSelectionMatches(),
          highlightSpecialChars(),
          history(),
          indentOnInput(),
          placeholder(slots.editor?.placeholder ?? ''), // TODO(burdon): Needs consistent styling.
          rectangularSelection(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          EditorState.allowMultipleSelections.of(true),
          EditorView.lineWrapping,

          keymap.of([
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...defaultKeymap,
            ...foldKeymap,
            ...historyKeymap,
            ...lintKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),

          // Main extension.
          // https://github.com/codemirror/lang-markdown
          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
            extensions: [
              // TODO(burdon): This seems to upgrade the parser.
              // GitHub flavored markdown bundle: Table, TaskList, Strikethrough, and Autolink.
              // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
              // https://github.github.com/gfm
              // GFM,

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

          // TODO(burdon): Move to extensions.
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

    // TODO(burdon): Create extension?
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
        tabIndex={0}
        ref={setParent}
        {...slots.root}
        {...(editorMode !== 'vim' ? tabsterDOMAttribute : {})}
        onKeyUp={handleKeyUp}
      />
    );
  },
);
