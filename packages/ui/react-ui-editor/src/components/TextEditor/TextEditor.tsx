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
  useState,
} from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { inputSurface, mx } from '@dxos/react-ui-theme';

import { basicBundle, markdownBundle } from './extensions';
import { defaultTheme, textTheme } from './themes';
import { type EditorModel, useCollaboration } from '../../hooks';
import { type ThemeStyles } from '../../styles';

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
  root: HTMLDivElement | null;
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
  ({ model, extensions = [], slots = defaultSlots, editorMode }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });

    // TODO(burdon): Pass in extension?
    const collaboration = useCollaboration(model, themeMode);

    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [state, setState] = useState<EditorState>();
    const [view, setView] = useState<EditorView>();
    useImperativeHandle(forwardedRef, () => ({ root, state, view }), [view, state, root]);

    useEffect(() => {
      if (!root) {
        return;
      }

      const state = EditorState.create({
        doc: model.text(),
        extensions: [
          // TODO(burdon): Factor out VIM mode?
          editorMode === 'vim' && vim(),

          // Theme.
          EditorView.baseTheme(defaultTheme),
          EditorView.theme(slots?.editor?.theme ?? {}),
          // TODO(burdon): themeMode doesn't change in storybooks.
          EditorView.darkTheme.of(themeMode === 'dark'),

          // Replication.
          collaboration,

          // Custom.
          ...extensions,
        ].filter(Boolean) as Extension[],
      });

      // NOTE: This repaints the editor.
      // If the new state is derived from the old state, it will likely not be visible other than the cursor resetting.
      // Ideally this should not be hit except when changing between text objects.
      view?.destroy();
      setView(new EditorView({ state, parent: root }));
      setState(state);

      return () => {
        view?.destroy();
        setView(undefined);
        setState(undefined);
      };
    }, [root, model.content, themeMode, editorMode]);

    const handleKeyUp = useCallback(
      (event: KeyboardEvent) => {
        const { key, altKey, shiftKey, metaKey, ctrlKey } = event;
        switch (key) {
          case 'Enter': {
            view?.contentDOM.focus();
            break;
          }

          case 'Escape': {
            editorMode === 'vim' && (altKey || shiftKey || metaKey || ctrlKey) && root?.focus();
            break;
          }
        }
      },
      [view, editorMode],
    );

    return (
      <div
        key={model.id}
        ref={setRoot}
        tabIndex={0}
        {...slots?.root}
        {...(editorMode !== 'vim' && tabsterDOMAttribute)}
        onKeyUp={handleKeyUp}
      />
    );
  },
);

// TODO(burdon): Set default text theme?
export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ extensions = [], slots: _slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const slots = defaultsDeep({}, _slots, defaultTextSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        extensions={[basicBundle({ themeMode, placeholder: slots?.editor?.placeholder }), ...extensions]}
        slots={slots}
        {...props}
      />
    );
  },
);

export const MarkdownEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ extensions = [], slots: _slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const slots = defaultsDeep({}, _slots, defaultSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        extensions={[markdownBundle({ themeMode, placeholder: slots?.editor?.placeholder }), ...extensions]}
        slots={slots}
        {...props}
      />
    );
  },
);

export const defaultSlots: TextEditorSlots = {
  root: {
    className: mx('p-2', inputSurface),
  },
};

export const defaultTextSlots: TextEditorSlots = {
  ...defaultSlots,
  editor: {
    theme: textTheme,
  },
};
