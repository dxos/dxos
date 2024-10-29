//
// Copyright 2023 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import React from 'react';

import { NavigationAction, parseIntentPlugin, type PluginDefinition, resolvePlugin } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { TextType } from '@dxos/plugin-markdown/types';
import { SpaceAction } from '@dxos/plugin-space';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { initializeBundler } from './bundler';
import { Compiler } from './compiler';
import { AutomationPanel, ScriptContainer, ScriptSettings } from './components';
import meta, { SCRIPT_PLUGIN } from './meta';
import { templates } from './templates';
import translations from './translations';
import { FunctionType, ScriptAction, type ScriptPluginProvides, ScriptType } from './types';

export const ScriptPlugin = (): PluginDefinition<ScriptPluginProvides> => {
  const compiler = new Compiler();

  return {
    meta,
    initialize: async () => {
      await compiler.initialize();
      // TODO(wittjosiah): Fetch types for https modules.
      compiler.setFile('/src/typings.d.ts', "declare module 'https://*';");
      // TODO(wittjosiah): Proper function handler types.
      // TODO(wittjosiah): Remove.
      compiler.setFile(
        '/src/runtime.ts',
        `
        export const Filter: any = {};
        export type FunctionHandler = ({ event, context }: { event: any; context: any }) => Promise<Response>;
        export const functionHandler = (handler: FunctionHandler) => handler;
      `,
      );
      await initializeBundler({ wasmUrl });
    },
    provides: {
      settings: {},
      metadata: {
        records: {
          [ScriptType.typename]: {
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: 'ph--code--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (script: ScriptType) => loadObjectReferences(script, (script) => [script.source]),
          },
        },
      },
      translations,
      echo: {
        schema: [ScriptType, FunctionType],
      },
      space: {
        onSpaceCreate: {
          label: ['create object label', { ns: SCRIPT_PLUGIN }],
          action: ScriptAction.CREATE,
        },
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
                    icon: 'ph--code--regular',
                    testId: 'scriptPlugin.createObject',
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
            case 'settings': {
              return data.plugin === meta.id ? <ScriptSettings settings={{}} /> : null;
            }

            case 'article': {
              if (data.object instanceof ScriptType) {
                return <ScriptContainer script={data.object} env={compiler.environment} />;
              }
              break;
            }

            // case 'complementary--settings': {
            // return <div>Settings!</div>;
            // }

            case 'complementary--automation': {
              return <AutomationPanel subject={data.subject as any} />;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ScriptAction.CREATE: {
              return { data: create(ScriptType, { source: create(TextType, { content: templates[0].source }) }) };
            }
          }
        },
      },
    },
  };
};
