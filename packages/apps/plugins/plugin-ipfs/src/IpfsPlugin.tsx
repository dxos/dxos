//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';

import { FileMain, FileSection, FileSlide } from './components';
import meta from './meta';
import translations from './translations';
import { type IpfsPluginProvides, isFile } from './types';

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isFile(data.active) ? <FileMain file={data.active} /> : null;
            case 'slide':
              return isFile(data.slide) ? <FileSlide file={data.slide} cover={false} /> : null;
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
