//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { create, type ReactiveEchoObject } from '@dxos/react-client/echo';

import { TemplateMain } from './components';
import meta, { TEMPLATE_PLUGIN } from './meta';
import translations from './translations';
import { TemplateAction, type TemplatePluginProvides, isObject } from './types';

const typename = 'template'; // Type.schema.typename

export const TemplatePlugin = (): PluginDefinition<TemplatePluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [typename]: {
            createObject: (props: { name?: string }) => createIntent(TemplateAction.Create, props),
            placeholder: ['object placeholder', { ns: TEMPLATE_PLUGIN }],
            icon: 'ph--asterisk--regular',
          },
        },
      },
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: TEMPLATE_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: ReactiveEchoObject<any> } => isObject(data.subject),
            component: ({ data }) => <TemplateMain object={data.subject} />,
          }),
      },
      intent: {
        resolvers: () =>
          createResolver(TemplateAction.Create, ({ name }) => ({
            // TODO(burdon): Set typename.
            data: { object: create({ type: 'template', name }) },
          })),
      },
    },
  };
};
