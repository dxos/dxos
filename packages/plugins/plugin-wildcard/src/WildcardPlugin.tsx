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

// TODO(burdon): Rename CardPlugin?
export const WildcardPlugin = (): PluginDefinition<WildcardPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      surface: {
        component: ({ data, role, ...props }, forwardedRef) => {
          switch (role) {
            case 'card': {
              // TODO(burdon): Standardize data.object?
              // TODO(burdon): Additional .object indirection is due to GridItem property.
              const object = data?.content;
              const cardProps = { ...props, item: (object as any)?.object ?? object };
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
