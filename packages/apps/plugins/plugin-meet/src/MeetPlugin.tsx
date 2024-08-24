//
// Copyright 2023 DXOS.org
//

import { type IconProps, Headphones } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import {
  NavigationAction,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  type LayoutCoordinate,
} from '@dxos/app-framework';
import '@preact/signals-react';

import { Meet } from './components';
import meta, { MEET_PLUGIN } from './meta';
import translations from './translations';
import { createMeetingRoom, MeetAction, type MeetPluginProvides, MeetingRoomType } from './types';

export const MeetPlugin = (): PluginDefinition<MeetPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MeetingRoomType.typename]: {
            placeholder: ['meet title placeholder', { ns: MEET_PLUGIN }],
            icon: (props: IconProps) => <Headphones {...props} />,
            iconSymbol: 'ph--grid-nine--regular',
          },
        },
      },
      translations,
      echo: {
        schema: [MeetingRoomType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: MeetAction.CREATE,
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
                  id: `${MEET_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: MEET_PLUGIN, action: MeetAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create meet label', { ns: MEET_PLUGIN }],
                    icon: (props: IconProps) => <Headphones {...props} />,
                    iconSymbol: 'ph--headphones--regular',
                    testId: 'meetPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-meet',
            testId: 'meetPlugin.createSectionSpaceMeet',
            label: ['create meet section label', { ns: MEET_PLUGIN }],
            icon: (props: any) => <Headphones {...props} />,
            intent: [
              {
                plugin: MEET_PLUGIN,
                action: MeetAction.CREATE,
              },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role = 'never' }) => {
          return ['main', 'article', 'section'].includes(role) && data.object instanceof MeetingRoomType ? (
            <Meet room={data.object} role={role} coordinate={data.coordinate as LayoutCoordinate} />
          ) : null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MeetAction.CREATE: {
              const room = createMeetingRoom();
              return { data: room };
            }
          }
        },
      },
    },
  };
};
