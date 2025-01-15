//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { contributes, Capabilities, createSurface } from '@dxos/app-framework';

import { FileContainer } from '../components';
import { WNFS_PLUGIN } from '../meta';
import { FileType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${WNFS_PLUGIN}/article`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data, role }) => <FileContainer role={role} file={data.subject} />,
    }),
  );
