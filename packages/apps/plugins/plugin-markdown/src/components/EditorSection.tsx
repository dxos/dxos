//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useRef } from 'react';

import { useTranslation } from '@dxos/react-ui';
import {
  tooltip,
  link,
  tasklist,
  MarkdownEditor,
  type TextEditorProps,
  type TextEditorRef,
} from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { type EditorMainProps } from './EditorMain';
import { onTooltip } from './extensions';
import { MARKDOWN_PLUGIN } from '../meta';

// TODO(burdon): Reconcile types.
type EditorSectionProps = Pick<EditorMainProps, 'showWidgets'> & Pick<TextEditorProps, 'model' | 'editorMode'>;

export const EditorSection = ({ model, editorMode, showWidgets }: EditorSectionProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const editorRef = useRef<TextEditorRef>(null);
  const extensions = [tooltip(onTooltip), tasklist()];
  if (showWidgets) {
    extensions.push(link());
  }

  return (
    <MarkdownEditor
      ref={editorRef}
      model={model}
      extensions={extensions}
      editorMode={editorMode}
      slots={{
        root: {
          role: 'none',
          className: mx(focusRing, 'is-[calc(100%-4px)] m-0.5 py-2'),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          placeholder: t('editor placeholder'),
          theme: {
            '&, & .cm-scroller': {
              inlineSize: '100%',
            },
            '& .cm-content': {
              paddingBlock: '1rem',
            },
            '& .cm-line': {
              paddingInline: '0',
            },
          },
        },
      }}
    />
  );
};
