//
// Copyright 2023 DXOS.org
//

import React, { type Ref } from 'react';

import {
  createSurface,
  type PluginDefinition,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
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
        definitions: () =>
          createSurface({
            id: meta.id,
            role: 'card',
            disposition: 'fallback',
            // TODO(wittjosiah): Should there be a props predicate filter as well?
            component: ({ data, role, ...props }, forwardedRef) => {
              const object = data?.subject;
              const cardProps = { ...props, item: (object as any)?.object ?? object };
              return isTileComponentProps(cardProps) ? (
                <Wildcard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
              ) : null;
            },
          }),
      },
    },
  };
};
