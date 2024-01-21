//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { MarkdownEditor, type TextEditorProps } from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

type EditorSectionProps = Pick<TextEditorProps, 'model' | 'editorMode' | 'extensions'>;

export const EditorSection = (props: EditorSectionProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  return (
    <MarkdownEditor
      placeholder={t('editor placeholder')}
      slots={{
        root: {
          className: mx('flex flex-col grow m-0.5', inputSurface, focusRing),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          className: 'h-full py-4',
        },
      }}
      {...props}
    />
  );
};
