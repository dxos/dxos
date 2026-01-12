//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, SettingsOperation } from '@dxos/app-framework';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { REGISTRY_ID, REGISTRY_KEY, meta } from '../../meta';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.AppGraphBuilder, [
      GraphBuilder.createExtension({
        id: meta.id,
        match: NodeMatcher.whenRoot,
        actions: () => [
          {
            id: meta.id,
            data: async () => {
              const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
              await invokePromise(SettingsOperation.OpenPluginRegistry);
            },
            properties: {
              label: ['open plugin registry label', { ns: meta.id }],
              icon: 'ph--squares-four--regular',
              disposition: 'menu',
            },
          },
        ],
      }),
      GraphBuilder.createExtension({
        id: meta.id,
        match: NodeMatcher.whenRoot,
        connector: () => [
          {
            id: REGISTRY_ID,
            type: meta.id,
            properties: {
              label: ['plugin registry label', { ns: meta.id }],
              icon: 'ph--squares-four--regular',
              disposition: 'pin-end',
              testId: 'treeView.pluginRegistry',
            },
            nodes: [
              {
                id: `${REGISTRY_KEY}+all`,
                type: 'category',
                data: `${REGISTRY_KEY}+all`,
                properties: {
                  label: ['all plugins label', { ns: meta.id }],
                  icon: 'ph--squares-four--regular',
                  key: REGISTRY_KEY,
                  testId: 'pluginRegistry.all',
                },
              },
              {
                id: `${REGISTRY_KEY}+installed`,
                type: 'category',
                data: `${REGISTRY_KEY}+installed`,
                properties: {
                  label: ['installed plugins label', { ns: meta.id }],
                  icon: 'ph--check--regular',
                  key: REGISTRY_KEY,
                  testId: 'pluginRegistry.installed',
                },
              },
              {
                id: `${REGISTRY_KEY}+recommended`,
                type: 'category',
                data: `${REGISTRY_KEY}+recommended`,
                properties: {
                  label: ['recommended plugins label', { ns: meta.id }],
                  icon: 'ph--star--regular',
                  key: REGISTRY_KEY,
                  testId: 'pluginRegistry.recommended',
                },
              },
              {
                id: `${REGISTRY_KEY}+labs`,
                type: 'category',
                data: `${REGISTRY_KEY}+labs`,
                properties: {
                  label: ['labs plugins label', { ns: meta.id }],
                  icon: 'ph--flask--regular',
                  key: REGISTRY_KEY,
                  testId: 'pluginRegistry.labs',
                },
              },
            ],
          },
        ],
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/actions`,
        match: NodeMatcher.whenId(REGISTRY_ID),
        actions: () => [
          {
            id: `${meta.id}/load-by-url`,
            data: async () => {},
            properties: {
              label: ['load by url label', { ns: meta.id }],
              icon: 'ph--cloud-arrow-down--regular',
              disabled: true,
            },
          },
        ],
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/plugins`,
        match: NodeMatcher.whenId(REGISTRY_ID),
        connector: () => {
          const manager = context.getCapability(Common.Capability.PluginManager);
          return manager.getPlugins().map((plugin) => ({
            id: plugin.meta.id.replaceAll('/', ':'),
            type: 'dxos.org/plugin',
            data: plugin,
            properties: {
              label: plugin.meta.name ?? plugin.meta.id,
              icon: plugin.meta.icon ?? 'ph--circle--regular',
              disposition: 'hidden',
            },
          }));
        },
      }),
    ]),
  ),
);
