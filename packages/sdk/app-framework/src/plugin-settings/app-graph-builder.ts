//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { ROOT_ID, createExtension } from '@dxos/app-graph';
import { type SettingsStore, type SettingsValue } from '@dxos/local-storage';
import { isNonNullable } from '@dxos/util';

import { Capabilities } from '../common';
import { type PluginContext, type PluginMeta, contributes } from '../core';
import { createIntent } from '../plugin-intent';

import { SETTINGS_ID, SETTINGS_KEY, SettingsAction } from './actions';
import { meta } from './meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/action`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: meta.id,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(SettingsAction.Open));
                },
                properties: {
                  label: ['open settings label', { ns: meta.id }],
                  icon: 'ph--gear--regular',
                  disposition: 'menu',
                  keyBinding: {
                    macos: 'meta+,',
                    windows: 'alt+,',
                  },
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/core`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: SETTINGS_ID,
                type: meta.id,
                properties: {
                  label: ['app settings label', { ns: meta.id }],
                  icon: 'ph--gear--regular',
                  disposition: 'pin-end',
                  position: 'hoist',
                  testId: 'treeView.appSettings',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/core-plugins`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id !== SETTINGS_ID ? Option.none() : Option.some(node))),
            Option.map(() => {
              const manager = get(context.capability(Capabilities.PluginManager));
              const [settingsStore] = get(context.capabilities(Capabilities.SettingsStore));
              return [
                ...manager.plugins
                  .filter((plugin) => manager.core.includes(plugin.meta.id))
                  .map((plugin): [PluginMeta, SettingsStore<SettingsValue>] | null => {
                    const settings = settingsStore?.getStore(plugin.meta.id);
                    if (!settings) {
                      return null;
                    }

                    return [plugin.meta, settings];
                  })
                  .filter(isNonNullable)
                  .map(([meta, settings]) => ({
                    id: `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
                    type: 'category',
                    data: settings,
                    properties: {
                      label: meta.name ?? meta.id,
                      icon: meta.icon ?? 'ph--circle--regular',
                    },
                  })),

                {
                  id: `${SETTINGS_KEY}:custom-plugins`,
                  type: 'category',
                  properties: {
                    label: ['custom plugins label', { ns: meta.id }],
                    icon: 'ph--squares-four--regular',
                    role: 'branch',
                    disposition: 'collection',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/custom-plugins`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              node.id !== `${SETTINGS_KEY}:custom-plugins` ? Option.none() : Option.some(node),
            ),
            Option.map(() => {
              const manager = get(context.capability(Capabilities.PluginManager));
              const [settingsStore] = get(context.capabilities(Capabilities.SettingsStore));
              return manager.plugins
                .filter((plugin) => !manager.core.includes(plugin.meta.id))
                .map((plugin): [PluginMeta, SettingsStore<SettingsValue>] | null => {
                  const settings = settingsStore?.getStore(plugin.meta.id);
                  if (!settings) {
                    return null;
                  }

                  return [plugin.meta, settings];
                })
                .filter(isNonNullable)
                .map(([meta, settings]) => ({
                  id: `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
                  type: 'category',
                  data: settings,
                  properties: {
                    label: meta.name ?? meta.id,
                    icon: meta.icon ?? 'ph--circle--regular',
                  },
                }));
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
