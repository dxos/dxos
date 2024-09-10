//
// Copyright 2023 DXOS.org
//

import { Code, type IconProps } from '@phosphor-icons/react';
import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
  type VirtualTypeScriptEnvironment,
} from '@typescript/vfs';
// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import React from 'react';
import ts from 'typescript';

import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { TextType } from '@dxos/plugin-markdown/types';
import { SpaceAction } from '@dxos/plugin-space';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { initializeCompiler } from './compiler';
import { ScriptEditor } from './components';
import meta, { SCRIPT_PLUGIN } from './meta';
import translations from './translations';
import { FunctionType, ScriptType } from './types';
import { ScriptAction, type ScriptPluginProvides } from './types';

export const ScriptPlugin = (): PluginDefinition<ScriptPluginProvides> => {
  let env: VirtualTypeScriptEnvironment | undefined;

  return {
    meta,
    initialize: async () => {
      await initializeCompiler({ wasmUrl });

      // TODO(wittjosiah): Figure out how to get workers working in plugin packages.
      //   https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
      const fsMap = await createDefaultMapFromCDN({ target: ts.ScriptTarget.ES2022 }, '5.5.4', true, ts);
      const system = createSystem(fsMap);
      const compilerOpts = { lib: ['DOM', 'es2022'] } satisfies ts.CompilerOptions;
      env = createVirtualTypeScriptEnvironment(system, [], ts, compilerOpts);
    },
    provides: {
      metadata: {
        records: {
          [ScriptType.typename]: {
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: (props: IconProps) => <Code {...props} />,
            iconSymbol: 'ph--code--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (script: ScriptType) => loadObjectReferences(script, (script) => [script.source]),
          },
        },
      },
      translations,
      echo: {
        schema: [ScriptType, FunctionType],
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
            intent: { plugin: SCRIPT_PLUGIN, action: ScriptAction.CREATE },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          if (role && !['article', 'section'].includes(role)) {
            return null;
          }

          if (data.object instanceof ScriptType) {
            return <ScriptEditor env={env} script={data.object} role={role} />;
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
