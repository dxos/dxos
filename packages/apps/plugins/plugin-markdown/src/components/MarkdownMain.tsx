//
// Copyright 2023 DXOS.org
//

import React, { HTMLAttributes, useRef } from 'react';

import { ComposerModel, MarkdownComposer, MarkdownComposerRef } from '@dxos/aurora-composer';
import { defaultFocus, mx } from '@dxos/aurora-theme';

import { MarkdownProperties } from '../props';
import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';

export const MarkdownMainStandalone = ({
  data: [model, properties],
}: {
  data: [ComposerModel, MarkdownProperties];
  role?: string;
}) => {
  return <MarkdownMain model={model} properties={properties} layout='standalone' />;
};

export const MarkdownMainEmbedded = ({
  data: [model, properties, _],
}: {
  data: [ComposerModel, MarkdownProperties, 'embedded'];
  role?: string;
}) => {
  return <MarkdownMain model={model} properties={properties} layout='embedded' />;
};

export const MarkdownMain = ({
  model,
  properties,
  layout,
}: {
  model: ComposerModel;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
}) => {
  const editorRef = useRef<MarkdownComposerRef>(null);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;

  return (
    <>
      <Root properties={properties} model={model} editorRef={editorRef}>
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
                '& .cm-line': { paddingInline: '1.5rem' },
              },
            },
          }}
        />
      </Root>
    </>
  );
};
