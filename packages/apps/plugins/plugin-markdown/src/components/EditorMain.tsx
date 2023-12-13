//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback } from 'react';

import { useTranslation } from '@dxos/react-ui';
import {
  createHyperlinkTooltip,
  type MarkdownEditorProps,
  type MarkdownEditorRef,
  MarkdownEditor,
  hyperlinkDecoration,
} from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';
import { onTooltip } from './extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownProperties } from '../types';

type EditorMainProps = {
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
  editorRefCb: RefCallback<MarkdownEditorRef>;
} & Pick<MarkdownEditorProps, 'model' | 'editorMode' | 'showWidgets' | 'onChange'>;

export const EditorMain = ({
  model,
  properties,
  layout,
  editorMode,
  showWidgets,
  onChange,
  editorRefCb,
}: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;
  const extensions = [createHyperlinkTooltip(onTooltip)];
  if (showWidgets) {
    extensions.push(hyperlinkDecoration());
  }

  return (
    <Root properties={properties} model={model}>
      <MarkdownEditor
        ref={editorRefCb}
        model={model}
        editorMode={editorMode}
        extensions={extensions}
        onChange={onChange}
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
      />
    </Root>
  );
};
