//
// Copyright 2024 DXOS.org
//

import React, { type FC, type HTMLAttributes, useEffect } from 'react';

import { ThreadAction } from '@braneframe/plugin-thread';
import { type Document as DocumentType } from '@braneframe/types';
import { useIntent } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { type Extension, MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownSettingsProps } from '../types';

export const DocumentSection: FC<{
  document: DocumentType;
  editorMode: MarkdownSettingsProps['editorMode'];
  extensions: Extension[];
}> = ({ document, editorMode, extensions }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { dispatch } = useIntent();
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document?.content });
  useEffect(() => {
    void dispatch({
      action: ThreadAction.SELECT,
    });
  }, [document.id]);

  if (!model) {
    return null;
  }

  return (
    <MarkdownEditor
      model={model}
      extensions={extensions}
      editorMode={editorMode}
      placeholder={t('editor placeholder')}
      slots={{
        root: {
          className: mx('flex flex-col grow m-0.5', attentionSurface, focusRing),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          className: 'h-full py-4',
        },
      }}
    />
  );
};
