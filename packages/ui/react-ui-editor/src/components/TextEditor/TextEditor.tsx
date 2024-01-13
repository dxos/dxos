//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { vim } from '@replit/codemirror-vim';
import defaultsDeep from 'lodash.defaultsdeep';
import React, {
  type KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
  type ComponentProps,
} from 'react';

import { generateName } from '@dxos/display-name';
import { useThemeContext } from '@dxos/react-ui';
import { getColorForValue, inputSurface, mx } from '@dxos/react-ui-theme';

import { basicBundle, markdownBundle, setCommentRange } from '../../extensions';
import { type CommentRange, type EditorModel } from '../../hooks';
import { type ThemeStyles } from '../../styles';
import { defaultTheme, markdownTheme, textTheme } from '../../themes';

export const EditorModes = ['default', 'vim'] as const;
export type EditorMode = (typeof EditorModes)[number];

export type CursorInfo = {
  from: number;
  to: number;
  line: number;
  lines: number;
  length: number;
  after?: string;
};

export type TextEditorSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  // editor?: {
  //   className?: string;
  // };
};

// TODO(burdon): Spellcheck?
export type TextEditorProps = {
  model: EditorModel;
  focus?: boolean;
  selection?: { anchor: number; head?: number };
  readonly?: boolean; // TODO(burdon): Move into model.
  comments?: CommentRange[]; // TODO(burdon): Move into extension.
  extensions?: Extension[];
  editorMode?: EditorMode;
  placeholder?: string;
  theme?: ThemeStyles;
  slots?: TextEditorSlots;
};

/**
 * Base text editor.
 */
export const BaseTextEditor = forwardRef<EditorView, TextEditorProps>(
  (
    { model, focus, selection, readonly, comments, extensions = [], editorMode, theme, slots = defaultSlots },
    forwardedRef,
  ) => {
    const tabsterDOMAttribute = useFocusableGroup({ tabBehavior: 'limited' });
    const { themeMode } = useThemeContext();

    // The editor view ref should only be used as an escape hatch.
    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);
    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    // Focus.
    useEffect(() => {
      if (view && focus) {
        view.focus();
      }
    }, [view, focus]);

    // TODO(burdon): Factor out as extension.
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

    // TODO(burdon): Factor out as extension.
    useEffect(() => {
      if (view && comments?.length) {
        view.dispatch({
          effects: setCommentRange.of({ model, comments }),
        });
      }
    }, [view, comments]);

    useEffect(() => {
      if (!model || !rootRef.current) {
        return;
      }

      // TODO(burdon): Remember cursor position.
      // https://codemirror.net/docs/ref/#state.EditorStateConfig
      const state = EditorState.create({
        doc: model.text(),
        selection,
        extensions: [
          readonly && EditorState.readOnly.of(readonly),

          // TODO(burdon): Factor out VIM mode? (manage via MarkdownPlugin).
          editorMode === 'vim' && vim(),

          // Theme.
          // TODO(burdon): Make theme configurable.
          EditorView.baseTheme(defaultTheme),
          EditorView.theme(theme ?? {}),
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
      const newView = new EditorView({
        parent: rootRef.current,
        state,
        // NOTE: Uncomment to spy on all transactions.
        // https://codemirror.net/docs/ref/#view.EditorView.dispatch
        // dispatch: (transaction, view) => {
        //   view.update([transaction]);
        // },
      });

      setView(newView);
      return () => {
        newView?.destroy();
        setView(null);
      };
    }, [rootRef, model, readonly, editorMode, themeMode]);

    const handleKeyUp = useCallback(
      (event: KeyboardEvent) => {
        const { key, altKey, shiftKey, metaKey, ctrlKey } = event;
        switch (key) {
          // TODO(burdon): Is this required (for vim mode?)
          // case 'Enter': {
          //   view?.contentDOM.focus();
          //   break;
          // }

          case 'Escape': {
            editorMode === 'vim' && (altKey || shiftKey || metaKey || ctrlKey) && rootRef.current?.focus();
            break;
          }
        }
      },
      [view, editorMode],
    );

    return (
      <div
        key={model.id}
        role='none'
        ref={rootRef}
        tabIndex={0}
        onKeyUp={handleKeyUp}
        {...slots.root}
        {...(editorMode !== 'vim' && tabsterDOMAttribute)}
      />
    );
  },
);

export const TextEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, extensions = [], theme = textTheme, slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultTextSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[
          basicBundle({ readonly, themeMode, placeholder: updatedSlots?.editor?.placeholder }),
          ...extensions,
        ]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

// TODO(burdon): Remove (Just provide bundle, slots).
export const MarkdownEditor = forwardRef<EditorView, TextEditorProps>(
  ({ readonly, extensions = [], theme = markdownTheme, slots, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const updatedSlots = defaultsDeep({}, slots, defaultMarkdownSlots);
    return (
      <BaseTextEditor
        ref={forwardedRef}
        readonly={readonly}
        extensions={[
          markdownBundle({ readonly, themeMode, placeholder: updatedSlots?.editor?.placeholder }),
          ...extensions,
        ]}
        theme={theme}
        slots={updatedSlots}
        {...props}
      />
    );
  },
);

export const defaultSlots: TextEditorSlots = {
  root: {
    className: mx('p-2 overflow-y-auto', inputSurface),
  },
};

export const defaultTextSlots: TextEditorSlots = {
  ...defaultSlots,
};

export const defaultMarkdownSlots: TextEditorSlots = {
  ...defaultSlots,
};
