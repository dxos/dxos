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
  /** The live prompt Text object (edits persist to its content). Ignored when `readonly`. */
  text?: Text.Text;
  /** Static prompt shown when `readonly` (e.g. a produced variant's recorded prompt). */
  value?: string;
  placeholder?: string;
  compact?: boolean;
  /** Show a static, non-editable prompt (`value`) rather than the live `text`. */
  readonly?: boolean;
  classNames?: string;
};

/**
 * Editable view of an Artifact's prompt, live-bound to the Instructions `text` object. Mirrors
 * plugin-bookmarks' Summary: the CodeMirror `EditorView` is owned locally and never carried in a
 * React prop, keeping the container's prop graph free of non-serializable editor state. When
 * `readonly`, it shows a static `value` (a produced variant's recorded prompt) with no persistence.
 */
export const PromptEditor = ({ id, text, value, placeholder, compact, readonly, classNames }: PromptEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    const theme = createThemeExtensions({ themeMode, slots: compact ? compactSlots : documentSlots });
    if (readonly) {
      return {
        initialValue: value ?? '',
        extensions: [createBasicExtensions({ lineWrapping: true, readOnly: true }), theme, createMarkdownExtensions()],
      };
    }

    if (!text) {
      return {};
    }

    return {
      initialValue: text.content ?? '',
      extensions: [
        createBasicExtensions({ lineWrapping: true, placeholder }),
        theme,
        createDataExtensions({ id, text: Doc.createAccessor(text, ['content']) }),
        createMarkdownExtensions(),
      ],
    };
  }, [themeMode, id, text, value, placeholder, compact, readonly]);

  return <div ref={parentRef} className={mx('dx-container', classNames)} />;
};
