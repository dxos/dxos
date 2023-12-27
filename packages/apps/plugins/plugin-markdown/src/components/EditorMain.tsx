//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { type TextEditorProps, type TextEditorRef, MarkdownEditor } from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { EmbeddedLayout } from './EmbeddedLayout';
import { StandaloneLayout } from './StandaloneLayout';
import { useExtensions, type UseExtensionsOptions } from './extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownProperties } from '../types';

export type SearchResult = {
  text: string;
  url: string;
};

export type EditorMainProps = {
  editorRefCb?: RefCallback<TextEditorRef>;
  properties: MarkdownProperties;
  layout: 'standalone' | 'embedded';
  extensions?: UseExtensionsOptions;
} & Pick<TextEditorProps, 'model' | 'editorMode'>;

export const EditorMain = ({
  editorRefCb,
  model,
  properties,
  layout,
  editorMode,
  extensions: _extensions,
}: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const Root = layout === 'embedded' ? EmbeddedLayout : StandaloneLayout;
  const extensions = useExtensions(_extensions);

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
