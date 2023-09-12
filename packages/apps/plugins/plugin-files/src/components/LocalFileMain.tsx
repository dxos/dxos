//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { Surface } from '@dxos/react-surface';

import { LocalFileMainPermissions } from './LocalFileMainPermissions';
import { LocalFile } from '../types';

export const LocalFileMain: FC<{ data: LocalFile }> = ({ data }) => {
  const transformedData = useMemo(
    () =>
      data.permission !== 'granted'
        ? {
            composer: { id: data.id, content: () => <LocalFileMainPermissions data={data} /> },
            properties: { title: data.title, readOnly: true },
          }
        : data.text
        ? {
            composer: { id: data.id, content: data.text },
            properties: { title: data.title, readOnly: true },
          }
        : data,
    [data.id, Boolean(data.text)],
  );

  return <Surface role='main' data={transformedData} />;
};
