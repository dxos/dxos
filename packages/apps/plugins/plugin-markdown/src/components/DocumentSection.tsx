//
// Copyright 2024 DXOS.org
//

import React, { type FC, type HTMLAttributes } from 'react';

import { type Document as DocumentType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { type Extension, MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

const DocumentSection: FC<{
  document: DocumentType;
  extensions: Extension[];
}> = ({ document, extensions }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document?.content });
  if (!model) {
    return null;
  }

  return (
    <MarkdownEditor
      model={model}
      extensions={extensions}
      placeholder={t('editor placeholder')}
      slots={{
        root: {
          className: mx('flex flex-col grow m-0.5 min-bs-[8rem]', attentionSurface, focusRing),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          className: 'h-full py-4',
        },
      }}
    />
  );
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
