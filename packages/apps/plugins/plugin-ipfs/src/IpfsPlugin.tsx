//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';

import { FileMain, FileSection, FileSlide } from './components';
import translations from './translations';
import { IPFS_PLUGIN, type IpfsPluginProvides, isFile } from './types';

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  return {
    meta: {
      id: IPFS_PLUGIN,
    },
    provides: {
      translations,
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isFile(data.active) ? <FileMain file={data.active} /> : null;
            case 'slide':
              return isFile(data.slide) ? <FileSlide file={data.slide} /> : null;
            case 'section':
              return isFile(data.object) ? <FileSection file={data.object} /> : null;
            default:
              return null;
          }
        },
      },
    },
  };
};
