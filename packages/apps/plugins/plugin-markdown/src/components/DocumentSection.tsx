//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type Document as DocumentType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  type Extension,
  useDocAccessor,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

const DocumentSection: FC<{
  document: DocumentType;
  extensions: Extension[];
}> = ({ document, extensions }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const identity = useIdentity();
  const space = getSpaceForObject(document);

  const { themeMode } = useThemeContext();
  const { doc, accessor } = useDocAccessor(document.content);
  const { parentRef } = useTextEditor({
    doc,
    extensions: [
      createBasicExtensions({ placeholder: t('editor placeholder') }),
      createThemeExtensions({
        themeMode,
        slots: {
          editor: {
            className: 'h-full py-4',
          },
        },
      }),
      createDataExtensions({ id: document.id, text: accessor, space, identity }),
      ...extensions,
    ],
  });

  return (
    <div
      ref={parentRef}
      {...{ 'data-testid': 'composer.markdownRoot' }}
      className={mx('flex flex-col grow m-0.5 min-bs-[8rem]', attentionSurface, focusRing)}
    />
  );
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
