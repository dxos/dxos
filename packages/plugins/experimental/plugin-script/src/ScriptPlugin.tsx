//
// Copyright 2023 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import React from 'react';

import { createIntent, createResolver, createSurface, type PluginDefinition } from '@dxos/app-framework';
import { create, makeRef, RefArray } from '@dxos/live-object';
import { TextType } from '@dxos/plugin-markdown/types';

import { initializeBundler } from './bundler';
import { Compiler } from './compiler';
import { AutomationPanel, ScriptContainer, ScriptSettings, ScriptSettingsPanel } from './components';
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
            createObject: (props: { name?: string }) => createIntent(ScriptAction.Create, props),
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: 'ph--code--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (script: ScriptType) => await RefArray.loadAll([script.source]),
          },
        },
      },
      translations,
      echo: {
        schema: [ScriptType],
        system: [FunctionType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${SCRIPT_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.subject === SCRIPT_PLUGIN,
            component: () => <ScriptSettings settings={{}} />,
          }),
          createSurface({
            id: `${SCRIPT_PLUGIN}/article`,
            role: 'article',
            filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
            component: ({ data }) => <ScriptContainer script={data.subject} env={compiler.environment} />,
          }),
          createSurface({
            id: `${SCRIPT_PLUGIN}/automation`,
            role: 'complementary--automation',
            disposition: 'hoist',
            filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
            component: ({ data }) => <AutomationPanel subject={data.subject} />,
          }),
          createSurface({
            id: `${SCRIPT_PLUGIN}/settings-panel`,
            role: 'complementary--settings',
            filter: (data): data is { subject: ScriptType } => data.subject instanceof ScriptType,
            component: ({ data }) => <ScriptSettingsPanel script={data.subject} />,
          }),
        ],
      },
      intent: {
        resolvers: () =>
          createResolver(ScriptAction.Create, ({ name }) => ({
            data: {
              object: create(ScriptType, {
                source: makeRef(
                  create(TextType, {
                    content: templates[0].source,
                  }),
                ),
              }),
            },
          })),
      },
    },
  };
};
