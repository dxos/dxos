//
// Copyright 2023 DXOS.org
//

import { Asterisk, Placeholder, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/react-client/echo';

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
            placeholder: ['object placeholder', { ns: TEMPLATE_PLUGIN }],
            icon: (props: IconProps) => <Asterisk {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: TemplateAction.CREATE,
            filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
            actions: ({ node }) => {
              const id = node.id.split('/').at(-1);
              const [spaceId, objectId] = id?.split(':') ?? [];
              const space = client.spaces.get().find((space) => space.id === spaceId);
              const object = objectId && space?.db.getObjectById(objectId);
              const target = objectId ? object : space;
              if (!target) {
                return;
              }

              return [
                {
                  id: `${TEMPLATE_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: TEMPLATE_PLUGIN, action: TemplateAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: TEMPLATE_PLUGIN }],
                    icon: (props: IconProps) => <Placeholder {...props} />,
                    testId: 'templatePlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isObject(data.active) ? <TemplateMain object={data.active} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TemplateAction.CREATE: {
              // TODO(burdon): Set typename.
              return { data: create({ type: 'template' }) };
            }
          }
        },
      },
    },
  };
};
