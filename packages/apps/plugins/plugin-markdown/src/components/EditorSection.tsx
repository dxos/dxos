//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useRef } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { MarkdownEditor, type TextEditorProps, type EditorView } from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

type EditorSectionProps = Pick<TextEditorProps, 'model' | 'extensions' | 'editorMode'>;

export const EditorSection = (props: EditorSectionProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const editorRef = useRef<EditorView>(null);

  return (
    <MarkdownEditor
      ref={editorRef}
      {...props}
      placeholder={t('editor placeholder')}
      theme={{
        '&, & .cm-scroller': {
          inlineSize: '100%',
        },
        '& .cm-content': {
          paddingBlock: '1rem',
        },
        '& .cm-line': {
          paddingInline: '0',
        },
      }}
      slots={{
        root: {
          className: mx(focusRing, 'is-[calc(100%-4px)] m-0.5 py-2'),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
      }}
    />
  );
};
