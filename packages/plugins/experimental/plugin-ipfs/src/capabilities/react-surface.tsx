//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { FileContainer } from '../components';
import { IPFS_PLUGIN } from '../meta';
import { FileType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${IPFS_PLUGIN}/article`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data, role }) => <FileContainer file={data.subject} role={role} />,
    }),
  );
