//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, SettingsAction, contributes, createIntent } from '@dxos/app-framework';
import { createExtension } from '@dxos/plugin-graph';

import { REGISTRY_ID, REGISTRY_KEY, meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: meta.id,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === 'root' ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: meta.id,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(SettingsAction.OpenPluginRegistry));
                },
                properties: {
                  label: ['open plugin registry label', { ns: meta.id }],
                  icon: 'ph--squares-four--regular',
                  disposition: 'menu',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: meta.id,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === 'root' ? Option.some(node) : Option.none())),
            Option.map((node) => [
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/actions`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === REGISTRY_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: `${meta.id}/load-by-url`,
                data: async () => {},
                properties: {
                  label: ['load by url label', { ns: meta.id }],
                  icon: 'ph--cloud-arrow-down--regular',
                  disabled: true,
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/plugins`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === REGISTRY_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              const manager = context.getCapability(Capabilities.PluginManager);
              return manager.plugins.map((plugin) => ({
                id: plugin.meta.id.replaceAll('/', ':'),
                type: 'dxos.org/plugin',
                data: plugin,
                properties: {
                  label: plugin.meta.name ?? plugin.meta.id,
                  icon: plugin.meta.icon ?? 'ph--circle--regular',
                  disposition: 'hidden',
                },
              }));
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
