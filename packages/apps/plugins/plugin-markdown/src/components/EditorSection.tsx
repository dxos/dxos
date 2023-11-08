//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useRef } from 'react';

import { type ComposerModel, MarkdownComposer, type MarkdownComposerRef } from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';

export const EditorSection = ({ content: document }: { content: ComposerModel }) => {
  const editorRef = useRef<MarkdownComposerRef>(null);

  return (
    <MarkdownComposer
      ref={editorRef}
      model={document}
      slots={{
        root: {
          role: 'none',
          className: mx(focusRing, 'min-bs-[10rem] shrink-0 grow flex flex-col'),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          markdownTheme: {
            '&, & .cm-scroller': {
              display: 'flex',
              flexDirection: 'column',
              flex: '1 0 auto',
              inlineSize: '100%',
            },
            '& .cm-content': { flex: '1 0 auto', inlineSize: '100%', paddingBlock: '1rem' },
            '& .cm-line': { paddingInline: '0' },
          },
        },
      }}
    />
  );
};
