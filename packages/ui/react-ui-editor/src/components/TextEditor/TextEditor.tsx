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

import { generateName } from '@dxos/display-name';
import { useThemeContext } from '@dxos/react-ui';
import { getColorForValue, inputSurface, mx } from '@dxos/react-ui-theme';

import { basicBundle, markdownBundle, setCommentRange } from './extensions';
import { defaultTheme, markdownTheme, textTheme } from './themes';
import { type CommentRange, type EditorModel } from '../../hooks';
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
  comments?: CommentRange[];
  readonly?: boolean;
  editorMode?: EditorMode;
  extensions?: Extension[];
  slots?: TextEditorSlots;
};

/**
 * Base text editor.
 * NOTE: Rather than adding properties, try to create extensions that can be reused.
 */
export const BaseTextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ model, comments, readonly, editorMode, extensions = [], slots = defaultSlots }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [{ state = undefined, view = undefined } = {}, setEditor] = useState<
      { state?: EditorState; view?: EditorView } | undefined
    >();
    useImperativeHandle(forwardedRef, () => ({ root, state, view }), [view, state, root]);

    // TODO(burdon): Factor out?
    const { awareness, peer } = model;
    useEffect(() => {
      if (awareness && peer) {
        awareness.setLocalStateField('user', {
          name: peer.name ?? generateName(peer.id),
          color: getColorForValue({ value: peer.id, type: 'color' }),
          colorLight: getColorForValue({ value: peer.id, themeMode, type: 'highlight' }),
        });
      }
    }, [awareness, peer, themeMode]);

    // TODO(burdon): How to make this pluggable?
    useEffect(() => {
      if (view && comments?.length) {
        view.dispatch({
          effects: setCommentRange.of({ model, comments }),
        });
      }
    }, [view, comments]);

    useEffect(() => {
      if (!root) {
        return;
      }

      // TODO(burdon): Remember cursor position.
      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      const state = EditorState.create({
        doc: model.text(),
        extensions: [
          readonly && EditorState.readOnly.of(readonly),

          // TODO(burdon): Factor out VIM mode? (manage via MarkdownPlugin).
          editorMode === 'vim' && vim(),

          // Theme.
          // TODO(burdon): Make theme configurable.
          EditorView.baseTheme(defaultTheme),
          EditorView.theme(slots?.editor?.theme ?? {}),
          EditorView.darkTheme.of(themeMode === 'dark'),

          // Storage and replication.
          model.extension,

          // Custom.
          ...extensions,
        ].filter(Boolean) as Extension[],
      });

      // NOTE: This repaints the editor.
      // If the new state is derived from the old state, it will likely not be visible other than the cursor resetting.
      // Ideally this should not happen except when changing between text objects.
      view?.destroy();
      setEditor({
        state,
        view: new EditorView({
          state,
          parent: root,
          // NOTE: Uncomment to spy on all transactions.
          // https://codemirror.net/docs/ref/#view.EditorView.dispatch
          // dispatch: (transaction, view) => {
          //   view.update([transaction]);
          // },
        }),
      });

      return () => {
        view?.destroy();
        setEditor(undefined);
      };
    }, [root, model, readonly, editorMode, themeMode]);

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

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ readonly, extensions = [], slots: _slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const slots = defaultsDeep({}, _slots, defaultTextSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[basicBundle({ readonly, themeMode, placeholder: slots?.editor?.placeholder }), ...extensions]}
        slots={slots}
        {...props}
      />
    );
  },
);

export const MarkdownEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ readonly, extensions = [], slots: _slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const slots = defaultsDeep({}, _slots, defaultMarkdownSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[markdownBundle({ readonly, themeMode, placeholder: slots?.editor?.placeholder }), ...extensions]}
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

export const defaultMarkdownSlots: TextEditorSlots = {
  ...defaultSlots,
  editor: {
    theme: markdownTheme,
  },
};
