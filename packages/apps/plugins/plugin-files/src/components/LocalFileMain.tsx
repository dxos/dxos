//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { Surface } from '@dxos/app-framework';

import { LocalFileMainPermissions } from './LocalFileMainPermissions';
import { type LocalFile } from '../types';

export const LocalFileMain: FC<{ file: LocalFile }> = ({ file }) => {
  const transformedData = useMemo(
    () =>
      file.permission !== 'granted'
        ? {
            composer: { id: file.id, content: () => <LocalFileMainPermissions entity={file} /> },
            properties: { title: file.title, readOnly: true },
          }
        : file.text
        ? {
            composer: { id: file.id, content: file.text },
            properties: { title: file.title, readOnly: true },
          }
        : { file },
    [file.id, Boolean(file.text)],
  );

  // TODO(wittjosiah): Render file list.
  if ('children' in file) {
    return null;
  }

  return <Surface role='main' data={transformedData} />;
};
