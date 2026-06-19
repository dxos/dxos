//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { createDocAccessor } from '@dxos/echo-client';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
} from '@dxos/ui-editor';

import { meta } from '#meta';

export type PromptEditorProps = {
  id: string;
  text?: Text.Text;
  placeholder?: string;
};

/**
 * Lightweight markdown editor bound to a Text ECHO object's `content` field.
 * Wraps the `@dxos/react-ui-editor` `EditorView` so we get the standard
 * focus / keyboard behaviour and styling without re-wiring the underlying
 * CodeMirror instance ourselves.
 */
export const PromptEditor = ({ id, text, placeholder }: PromptEditorProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () =>
      text
        ? [
            createDataExtensions({
              id,
              text: createDocAccessor(text, ['content']),
            }),
            createBasicExtensions({
              bracketMatching: false,
              lineWrapping: true,
              placeholder: placeholder ?? t('prompt.placeholder'),
            }),
            createThemeExtensions({ themeMode, slots: documentSlots }),
            createMarkdownExtensions(),
            decorateMarkdown(),
          ]
        : [],
    [id, text, placeholder, t, themeMode],
  );

  return <Editor.Root extensions={extensions}>{extensions.length > 0 && <Editor.View id={id} />}</Editor.Root>;
};
