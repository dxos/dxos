//
// Copyright 2023 DXOS.org
//

import React, { type Ref } from 'react';

import { Capabilities, contributes, createSurface, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { isTileComponentProps } from '@dxos/react-ui-mosaic';

import { Wildcard } from './components';
import { meta } from './meta';
import translations from './translations';

// TODO(burdon): Rename CardPlugin?
export const WildcardPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(
          Capabilities.ReactSurface,
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
        ),
    }),
  ]);
