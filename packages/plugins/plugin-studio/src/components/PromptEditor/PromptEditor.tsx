//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Doc } from '@dxos/echo-doc';
import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import {
  compactSlots,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  documentSlots,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

export type PromptEditorProps = {
  /** Stable editor/document id (used for collaboration + selection state). */
  id: string;
  /** The live prompt Text object (edits persist to its content). */
  text?: Text.Text;
  placeholder?: string;
  compact?: boolean;
  classNames?: string;
};

/**
 * Editable view of an Artifact's prompt, live-bound to the Instructions `text` object. Mirrors
 * plugin-bookmarks' Summary: the CodeMirror `EditorView` is owned locally and never carried in a
 * React prop, keeping the container's prop graph free of non-serializable editor state.
 */
export const PromptEditor = ({ id, text, placeholder, compact, classNames }: PromptEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    if (!text) {
      return {};
    }

    return {
      initialValue: text.content ?? '',
      extensions: [
        createBasicExtensions({ lineWrapping: true, placeholder }),
        createThemeExtensions({ themeMode, slots: compact ? compactSlots : documentSlots }),
        createDataExtensions({ id, text: Doc.createAccessor(text, ['content']) }),
        createMarkdownExtensions(),
      ],
    };
  }, [themeMode, id, text, placeholder, compact]);

  return <div ref={parentRef} className={mx('dx-container', classNames)} />;
};
