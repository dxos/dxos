//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { contributes, Capabilities, createSurface } from '@dxos/app-framework';

import { FileMain, FileSection, FileSlide } from '../components';
import { WNFS_PLUGIN } from '../meta';
import { FileType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${WNFS_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data }) => <FileMain file={data.subject} />,
    }),
    createSurface({
      id: `${WNFS_PLUGIN}/section`,
      role: 'section',
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data }) => <FileSection file={data.subject} />,
    }),
    createSurface({
      id: `${WNFS_PLUGIN}/slide`,
      role: 'slide',
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data }) => <FileSlide file={data.subject} cover={false} />,
    }),
  ]);
