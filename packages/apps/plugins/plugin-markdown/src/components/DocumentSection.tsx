//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Extension,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useDocAccessor,
  useTextEditor,
  createMarkdownExtensions,
} from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';

const DocumentSection: FC<{
  document: DocumentType;
  extensions: Extension[];
}> = ({ document, extensions }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const identity = useIdentity();
  const space = getSpaceForObject(document);

  const { themeMode } = useThemeContext();
  const { doc, accessor } = useDocAccessor(document.content!);
  const { parentRef } = useTextEditor(
    () => ({
      doc,
      extensions: [
        createBasicExtensions({ placeholder: t('editor placeholder') }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({
          themeMode,
        }),
        createDataExtensions({ id: document.id, text: accessor, space, identity }),
        ...extensions,
      ],
    }),
    [document, extensions, themeMode],
  );

  return <div ref={parentRef} className='min-bs-[8rem]' data-testid='composer.markdownRoot' />;
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
