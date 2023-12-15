//
// Copyright 2023 DXOS.org
//

import React, { type Ref } from 'react';

import type { PluginDefinition, SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import { Wildcard } from './components';
import meta from './meta';
import translations from './translations';

export type WildcardPluginProvides = SurfaceProvides & TranslationsProvides;

export const WildcardPlugin = (): PluginDefinition<WildcardPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          switch (role) {
            case 'card': {
              const cardProps = { ...props, item: data.content };
              return isTileComponentProps(cardProps)
                ? {
                    node: <Wildcard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />,
                    disposition: 'fallback',
                  }
                : null;
            }
          }

          return null;
        },
      },
    },
  };
};
