//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  resolvePlugin,
  parseIntentPlugin,
  type PluginDefinition,
  NavigationAction,
  createSurface,
} from '@dxos/app-framework';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
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
            placeholder: ['object placeholder', { ns: TEMPLATE_PLUGIN }],
            icon: 'ph--asterisk--regular',
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
                    icon: 'ph--placeholder--regular',
                    testId: 'templatePlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      surface: {
        definitions: () =>
          createSurface({
            id: TEMPLATE_PLUGIN,
            role: 'article',
            filter: (data): data is { object: ReactiveEchoObject<any> } => isObject(data.object),
            component: ({ data }) => <TemplateMain object={data.object} />,
          }),
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
