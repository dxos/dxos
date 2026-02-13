//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { GraphBuilder, NodeMatcher } from '@dxos/app-graph';
import { Operation } from '@dxos/operation';
import { isNonNullable } from '@dxos/util';

import * as Common from '../common';
import { Capability, type Plugin } from '../core';

import { SETTINGS_ID, SETTINGS_KEY, SettingsOperation } from './actions';
import { meta } from './meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;
    const managerAtom = capabilities.atom(Common.Capability.PluginManager);
    const settingsAtom = capabilities.atom(Common.Capability.Settings);

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: `${meta.id}/action`,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: meta.id,
              data: () => Operation.invoke(SettingsOperation.Open, {}),
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
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/core`,
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
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
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}/plugins`,
        match: NodeMatcher.whenId(SETTINGS_ID),
        connector: (node, get) => {
          const [manager] = get(managerAtom);
          const allSettings = get(settingsAtom);
          return Effect.succeed(
            manager
              .getPlugins()
              .map((plugin: Plugin.Plugin): [Plugin.Meta, Common.Capability.Settings] | null => {
                const settings = allSettings.find((s) => s.prefix === plugin.meta.id);
                if (!settings) {
                  return null;
                }

                return [plugin.meta, settings];
              })
              .filter(isNonNullable)
              .map(([meta, settings]: [Plugin.Meta, Common.Capability.Settings]) => ({
                id: `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
                type: 'category',
                data: settings,
                properties: {
                  label: meta.name ?? meta.id,
                  icon: meta.icon ?? 'ph--circle--regular',
                },
              })),
          );
        },
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
