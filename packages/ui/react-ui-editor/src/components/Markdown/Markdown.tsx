//
// Copyright 2023 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { vim } from '@replit/codemirror-vim';
import React, { type KeyboardEvent, forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';
import { yCollab } from 'y-codemirror.next';

import { generateName } from '@dxos/display-name';
import { useThemeContext } from '@dxos/react-ui';
import { getColorForValue } from '@dxos/react-ui-theme';
import { YText } from '@dxos/text-model';

import { basicBundle, markdownBundle } from './extensions';
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
  editorMode?: EditorMode;
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

    // Presence/awareness.
    // TODO(burdon): Plugin.
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
          basicBundle({ placeholder: slots?.editor?.placeholder }),
          markdownBundle({ themeMode, theme: slots.editor?.markdownTheme }),

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

    return (
      <div
        key={model.id}
        ref={setParent}
        tabIndex={0}
        {...slots.root}
        {...(editorMode !== 'vim' ? tabsterDOMAttribute : {})}
        onKeyUp={handleKeyUp}
      />
    );
  },
);
