//
// Copyright 2023 DXOS.org
//

import React, { HTMLAttributes, RefCallback } from 'react';

import { useTranslation } from '@dxos/aurora';
import { ComposerModel, MarkdownComposer, MarkdownComposerProps, MarkdownComposerRef } from '@dxos/aurora-composer';
import { focusRing, mx } from '@dxos/aurora-theme';

import { MARKDOWN_PLUGIN, MarkdownProperties } from '../types';
import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';

// TODO(wittjosiah): Rename aurora-composer to aurora-editor.
export const EditorMain = ({
  model,
  properties,
  layout,
  editorMode,
  onChange,
  editorRefCb,
}: {
  model: ComposerModel;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
  editorMode?: MarkdownComposerProps['editorMode'];
  onChange?: MarkdownComposerProps['onChange'];
  editorRefCb: RefCallback<MarkdownComposerRef>;
}) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;

  return (
    <Root properties={properties} model={model}>
      <MarkdownComposer
        ref={editorRefCb}
        model={model}
        editorMode={editorMode}
        onChange={onChange}
        slots={{
          root: {
            role: 'none',
            className: mx(focusRing, 'shrink-0 grow flex flex-col'),
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
              '& .cm-line': { paddingInline: '1rem' },
            },
            placeholder: t('editor placeholder'),
          },
        }}
      />
    </Root>
  );
};
