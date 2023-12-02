//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useRef } from 'react';

import { type EditorModel, MarkdownEditor, type MarkdownEditorRef } from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';

export const EditorSection = ({ content: document }: { content: EditorModel }) => {
  const editorRef = useRef<MarkdownEditorRef>(null);

  return (
    <MarkdownEditor
      ref={editorRef}
      model={document}
      slots={{
        root: {
          role: 'none',
          className: mx(focusRing, 'm-0.5 is-[calc(100%-4px)]'),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          markdownTheme: {
            '&, & .cm-scroller': {
              inlineSize: '100%',
            },
            '& .cm-content': {
              paddingBlock: '1rem',
            },
            '& .cm-line': { paddingInline: '0' },
          },
        },
      }}
    />
  );
};
