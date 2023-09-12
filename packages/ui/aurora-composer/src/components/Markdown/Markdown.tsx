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
import { EditorState, StateField, Text } from '@codemirror/state';
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
import { vim } from '@replit/codemirror-vim';
import React, {
  KeyboardEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { yCollab } from 'y-codemirror.next';

import { useThemeContext } from '@dxos/aurora';
import { configColors } from '@dxos/aurora-theme';
import { generateName } from '@dxos/display-name';
import { YText } from '@dxos/text-model';

import { markdownTagsExtension } from './markdownTags';
import { markdownDarkHighlighting, markdownTheme } from './markdownTheme';
import { ComposerModel, ComposerSlots } from '../../model';

export const EditorModes = ['default', 'vim'] as const;
export type EditorMode = (typeof EditorModes)[number];

export type MarkdownComposerProps = {
  model?: ComposerModel;
  slots?: ComposerSlots;
  editorMode?: EditorMode;
  onChange?: (content: string | Text) => void;
};

export type MarkdownComposerRef = {
  editor: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
};

const hexadecimalPaletteSeries: (keyof typeof configColors)[] = [
  'red' as const,
  'orange' as const,
  'amber' as const,
  'yellow' as const,
  'lime' as const,
  'green' as const,
  'emerald' as const,
  'teal' as const,
  'cyan' as const,
  'sky' as const,
  'indigo' as const,
  'violet' as const,
  'purple' as const,
  'fuchsia' as const,
  'pink' as const,
  'rose' as const,
];

const shadeKeys = {
  color: '450' as const,
  highlightDark: '800' as const,
  highlightLight: '100' as const,
};

export const MarkdownComposer = forwardRef<MarkdownComposerRef, MarkdownComposerProps>(
  ({ model, slots = {}, onChange, editorMode }, forwardedRef) => {
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
        let peerColorDigit = Math.floor(16 * Math.random());
        try {
          // TODO(wittjosiah): Factor out for use w/ html-only story and RichText component.
          // `peer.id` is already a `string`, so we attempt `parseInt` within a `try` since we can’t be certain it is hexadecimal.
          peerColorDigit = parseInt(peer.id.slice(-1), 16);
        } catch (_) {}
        provider.awareness.setLocalStateField('user', {
          name: peer.name ?? generateName(peer.id),
          color: configColors[hexadecimalPaletteSeries[peerColorDigit]][shadeKeys.color],
          colorLight:
            configColors[hexadecimalPaletteSeries[peerColorDigit]][
              shadeKeys[themeMode === 'dark' ? 'highlightDark' : 'highlightLight']
            ],
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

          ...(editorMode === 'vim' ? [vim()] : []),

          // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
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
          // Theme
          markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }),
          EditorView.theme({ ...markdownTheme, ...slots.editor?.markdownTheme }),
          ...(themeMode === 'dark'
            ? [syntaxHighlighting(oneDarkHighlightStyle)]
            : [syntaxHighlighting(defaultHighlightStyle)]),
          // TODO(thure): All but one rule here apply to both themes; rename or refactor.
          syntaxHighlighting(markdownDarkHighlighting),

          // Collaboration
          ...(content instanceof YText ? [yCollab(content, provider?.awareness)] : []),
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
      ({ key, altKey, shiftKey, metaKey, ctrlKey }: KeyboardEvent) => {
        switch (key) {
          case 'Enter':
            view?.contentDOM.focus();
            break;

          case 'Escape':
            editorMode === 'vim' && (altKey || shiftKey || metaKey || ctrlKey) && parent?.focus();
            break;
        }
      },
      [view, editorMode],
    );

    return (
      <div
        tabIndex={0}
        key={id}
        {...slots.root}
        onKeyUp={handleKeyUp}
        {...(editorMode !== 'vim' ? tabsterDOMAttribute : {})}
        ref={setParent}
      />
    );
  },
);
