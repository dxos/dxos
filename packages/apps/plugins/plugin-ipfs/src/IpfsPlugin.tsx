//
// Copyright 2023 DXOS.org
//

import { FileCloud, type IconProps } from '@phosphor-icons/react';
import React, { type Ref } from 'react';

import { File } from '@braneframe/types';
import { type PluginDefinition, isObject } from '@dxos/app-framework';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import { FileCard, FileMain, FileSection, FileSlide } from './components';
import meta, { IPFS_PLUGIN } from './meta';
import translations from './translations';
import { type IpfsPluginProvides, isFile } from './types';

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      metadata: {
        records: {
          [File.schema.typename]: {
            placeholder: ['file title placeholder', { ns: IPFS_PLUGIN }],
            icon: (props: IconProps) => <FileCloud {...props} />,
          },
        },
      },
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          switch (role) {
            case 'main':
              return isFile(data.active) ? <FileMain file={data.active} /> : null;
            case 'slide':
              return isFile(data.slide) ? <FileSlide file={data.slide} cover={false} /> : null;
            case 'section':
              return isFile(data.object) ? <FileSection file={data.object} /> : null;
            case 'card': {
              if (isObject(data.content) && typeof data.content.id === 'string' && isFile(data.content.object)) {
                const cardProps = { ...props, item: { id: data.content.id, object: data.content.object } };
                return isTileComponentProps(cardProps) ? (
                  <FileCard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
                ) : null;
              }
              break;
            }
          }

          return null;
        },
      },
    },
  };
};
