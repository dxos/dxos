//
// Copyright 2023 DXOS.org
//

import React, { HTMLAttributes, useRef } from 'react';

import { ComposerModel, MarkdownComposer, MarkdownComposerRef } from '@dxos/aurora-composer';
import { defaultFocus, mx } from '@dxos/aurora-theme';

import { MarkdownProperties } from '../props';

export const MarkdownSection = ({
  data: { source, object },
}: {
  data: { source: { guid: string; resolver: string }; object: MarkdownProperties & ComposerModel };
}) => {
  const editorRef = useRef<MarkdownComposerRef>(null);
  const model: ComposerModel = {
    id: object.id,
    content: object.content,
  };
  return (
    <MarkdownComposer
      ref={editorRef}
      model={model}
      slots={{
        root: {
          role: 'none',
          className: mx(defaultFocus, 'shrink-0 grow flex flex-col'),
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
