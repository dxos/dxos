//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback } from 'react';

import { useTranslation } from '@dxos/react-ui';
import {
  createHyperlinkTooltip,
  type TextEditorProps,
  type TextEditorRef,
  MarkdownEditor,
  hyperlinkDecoration,
  onChangeExtension,
  markdownTheme,
} from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';
import { onTooltip } from './extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownProperties } from '../types';

export type EditorMainProps = {
  editorRefCb: RefCallback<TextEditorRef>;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
  showWidgets?: boolean;
  onChange?: (text: string) => void;
} & Pick<TextEditorProps, 'model' | 'editorMode'>;

export const EditorMain = ({
  editorRefCb,
  model,
  properties,
  layout,
  editorMode,
  showWidgets,
  onChange,
}: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;
  const extensions = [createHyperlinkTooltip(onTooltip)];
  if (onChange) {
    extensions.push(onChangeExtension(onChange));
  }
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
        slots={{
          root: {
            role: 'none',
            className: mx(
              focusRing,
              inputSurface,
              surfaceElevation({ elevation: 'group' }),
              layout !== 'embedded' && 'rounded',
              'flex flex-col shrink-0 grow pli-10 m-0.5 py-2',
            ),
            'data-testid': 'composer.markdownRoot',
          } as HTMLAttributes<HTMLDivElement>,
          editor: {
            placeholder: t('editor placeholder'),
            theme: {
              ...markdownTheme,
              '&, & .cm-scroller': {
                display: 'flex',
                flexDirection: 'column',
                flex: '1 0 auto',
                inlineSize: '100%',
              },
              '& .cm-content': {
                flex: '1 0 auto',
                inlineSize: '100%',
                paddingBlock: '1rem',
              },
            },
          },
        }}
      />
    </Root>
  );
};
