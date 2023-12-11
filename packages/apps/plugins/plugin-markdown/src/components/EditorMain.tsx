//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback } from 'react';

import { useTranslation } from '@dxos/react-ui';
import {
  createHyperlinkTooltip,
  defaultHyperLinkTooltip,
  type EditorModel,
  type MarkdownEditorProps,
  type MarkdownEditorRef,
  MarkdownEditor,
} from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';
import { onTooltip } from './extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownProperties } from '../types';

export const EditorMain = ({
  model,
  properties,
  layout,
  editorMode,
  onChange,
  editorRefCb,
}: {
  model: EditorModel;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
  editorMode?: MarkdownEditorProps['editorMode'];
  onChange?: MarkdownEditorProps['onChange'];
  editorRefCb: RefCallback<MarkdownEditorRef>;
}) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;

  return (
    <Root properties={properties} model={model}>
      <MarkdownEditor
        ref={editorRefCb}
        model={model}
        extensions={[defaultHyperLinkTooltip]}
        editorMode={editorMode}
        extensions={[createHyperlinkTooltip(onTooltip)]}
        slots={{
          root: {
            role: 'none',
            className: mx(
              focusRing,
              inputSurface,
              surfaceElevation({ elevation: 'group' }),
              layout !== 'embedded' && 'rounded',
              'pli-10 m-0.5 shrink-0 grow flex flex-col',
            ),
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
            },
            placeholder: t('editor placeholder'),
          },
        }}
        onChange={onChange}
      />
    </Root>
  );
};
