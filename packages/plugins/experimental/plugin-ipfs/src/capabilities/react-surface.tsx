//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { FileMain, FileSection, FileSlide } from '../components';
import { IPFS_PLUGIN } from '../meta';
import { FileType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${IPFS_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data }) => <FileMain file={data.subject} />,
    }),
    createSurface({
      id: `${IPFS_PLUGIN}/section`,
      role: 'section',
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data }) => <FileSection file={data.subject} />,
    }),
    createSurface({
      id: `${IPFS_PLUGIN}/slide`,
      role: 'slide',
      filter: (data): data is { subject: FileType } => data.subject instanceof FileType,
      component: ({ data }) => <FileSlide file={data.subject} cover={false} />,
    }),
  ]);
