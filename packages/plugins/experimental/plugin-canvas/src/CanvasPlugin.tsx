//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  createSurface,
  NavigationAction,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { CanvasContainer } from './components';
import meta, { CANVAS_PLUGIN } from './meta';
import translations from './translations';
import { CanvasItemType, CanvasType } from './types';
import { CanvasAction, type CanvasPluginProvides } from './types';

export const CanvasPlugin = (): PluginDefinition<CanvasPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [CanvasType.typename]: {
            createObject: CanvasAction.CREATE,
            placeholder: ['canvas title placeholder', { ns: CANVAS_PLUGIN }],
            icon: 'ph--infinity--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (canvas: CanvasType) => loadObjectReferences(canvas, (canvas) => canvas.items),
          },
          [CanvasItemType.typename]: {
            parse: (item: CanvasItemType, type: string) => {
              switch (type) {
                case 'node':
                  return {
                    id: item.object.target?.id,
                    label: (item.object.target as any).title,
                    data: item.object.target,
                  };
                case 'object':
                  return item.object.target;
                case 'view-object':
                  return item;
              }
            },
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (item: CanvasItemType) => [], // loadObjectReferences(item, (item) => [item.object])
          },
        },
      },
      translations,
      echo: {
        schema: [CanvasType],
        system: [CanvasItemType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: CanvasAction.CREATE,
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
                  id: `${CANVAS_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: CANVAS_PLUGIN, action: CanvasAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create canvas label', { ns: CANVAS_PLUGIN }],
                    icon: 'ph--infinity--regular',
                    testId: 'canvasPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      surface: {
        definitions: () => [
          createSurface({
            id: CANVAS_PLUGIN,
            role: 'article',
            filter: (data): data is { subject: CanvasType } => data.subject instanceof CanvasType,
            component: ({ data }) => <CanvasContainer canvas={data.subject} />,
          }),
        ],
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case CanvasAction.CREATE: {
              return { data: create(CanvasType, { items: [] }) };
            }
          }
        },
      },
    },
  };
};
