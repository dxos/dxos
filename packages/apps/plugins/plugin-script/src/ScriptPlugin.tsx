//
// Copyright 2023 DXOS.org
//

import { Code, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { ScriptType, TextType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';

import { ScriptEditor } from './components';
import meta, { SCRIPT_PLUGIN } from './meta';
import translations from './translations';
import { ScriptAction, type ScriptPluginProvides } from './types';

export type ScriptPluginProps = {
  containerUrl: string;
};

export const ScriptPlugin = ({ containerUrl }: ScriptPluginProps): PluginDefinition<ScriptPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ScriptType.typename]: {
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: (props: IconProps) => <Code {...props} />,
            iconSymbol: 'ph--code--regular',
          },
        },
      },
      translations,
      echo: {
        schema: [ScriptType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: ScriptAction.CREATE,
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
                  id: `${SCRIPT_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: SCRIPT_PLUGIN, action: ScriptAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: SCRIPT_PLUGIN }],
                    icon: (props: IconProps) => <Code {...props} />,
                    iconSymbol: 'ph--code--regular',
                    testId: 'scriptPlugin.createObject',
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
            id: 'create-stack-section-script',
            testId: 'scriptPlugin.createSectionSpaceScript',
            type: ['plugin name', { ns: SCRIPT_PLUGIN }],
            label: ['create stack section label', { ns: SCRIPT_PLUGIN }],
            icon: (props: any) => <Code {...props} />,
            intent: {
              plugin: SCRIPT_PLUGIN,
              action: ScriptAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          if (role && !['article', 'section'].includes(role)) {
            return null;
          }

          if (data.object instanceof ScriptType) {
            return <ScriptEditor script={data.object} role={role} />;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ScriptAction.CREATE: {
              return { data: create(ScriptType, { source: create(TextType, { content: example }) }) };
            }
          }
        },
      },
    },
  };
};

// TODO(burdon): Import.
const example = [
  'export default {',
  '  async fetch(request, env, ctx) {',
  "    return new Response('Hello World, from ScriptPlugin!');",
  '  }',
  '}',
  '',
].join('\n');
