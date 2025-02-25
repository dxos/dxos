//
// Copyright 2023 DXOS.org
//

import React, { type Ref } from 'react';

import { Capabilities, contributes, createSurface, defineModule, definePlugin, Events } from '@dxos/app-framework';

import { Wildcard } from './components';
import { meta } from './meta';
import translations from './translations';

export const isTileProps = (
  props: Record<string, unknown>,
): props is { path: 'string'; item: { id: string; [key: string]: any } } =>
  typeof props.path === 'string' && typeof props.item === 'object' && props.item
    ? 'id' in props.item && typeof props.item.id === 'string'
    : false;

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
      activatesOn: Events.SetupSurfaces,
      activate: () =>
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: meta.id,
            role: 'card',
            position: 'fallback',
            // TODO(wittjosiah): Should there be a props predicate filter as well?
            component: ({ data, role, ...props }, forwardedRef) => {
              const object = data?.subject;
              const cardProps = { ...props, item: (object as any)?.object ?? object };
              return isTileProps(cardProps) ? (
                <Wildcard {...cardProps} ref={forwardedRef as Ref<HTMLDivElement>} />
              ) : null;
            },
          }),
        ),
    }),
  ]);
