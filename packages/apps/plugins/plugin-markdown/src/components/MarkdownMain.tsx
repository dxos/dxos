//
// Copyright 2023 DXOS.org
//

import React, { HTMLAttributes, useRef } from 'react';

import { ComposerModel, MarkdownComposer, MarkdownComposerProps, MarkdownComposerRef } from '@dxos/aurora-composer';
import { defaultFocus, mx } from '@dxos/aurora-theme';

import { MarkdownProperties } from '../props';
import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';

export const MarkdownMain = ({
  model,
  properties,
  layout,
  onChange,
}: {
  model: ComposerModel;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
  onChange?: MarkdownComposerProps['onChange'];
}) => {
  const editorRef = useRef<MarkdownComposerRef>(null);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;

  return (
    <>
      <Root properties={properties} model={model} editorRef={editorRef}>
        <MarkdownComposer
          ref={editorRef}
          model={model}
          onChange={onChange}
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
                '& .cm-line': { paddingInline: '1.5rem' },
              },
            },
          }}
        />
      </Root>
    </>
  );
};
