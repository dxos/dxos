//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import type * as Plugin$ from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Position, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SettingsPath } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;
    const managerAtom = capabilities.atom(Capabilities.PluginManager);
    const settingsAtom = capabilities.atom(AppCapabilities.Settings);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'action',
        match: GraphNodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: 'root',
              data: () => Operation.invoke(SettingsOperation.Open, {}),
              properties: {
                label: ['plugin-settings.label', { ns: meta.profile.key }],
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
      AppGraphBuilder.createExtension({
        id: 'core',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppGraphNode.make({
              id: SettingsPath.SETTINGS_ID,
              type: meta.profile.key,
              properties: {
                label: ['plugin-settings.label', { ns: meta.profile.key }],
                icon: 'ph--gear--regular',
                disposition: 'pin-end',
                position: Position.first,
                testId: 'treeView.appSettings',
              },
            }),
          ]),
      }),
      AppGraphBuilder.createExtension({
        id: 'plugins',
        url: { key: 'plugin', kind: 'item', path: [] },
        match: GraphNodeMatcher.whenId(GraphPath.getSpacePath(SettingsPath.SETTINGS_ID)),
        connector: (node, get) => {
          const [manager] = get(managerAtom);
          const allSettings = get(settingsAtom);
          return Effect.succeed(
            manager
              .getPlugins()
              .map((plugin: Plugin$.Plugin): [Plugin$.Meta, AppCapabilities.Settings] | null => {
                const settings = allSettings.find((s) => s.prefix === plugin.meta.profile.key);
                if (!settings) {
                  return null;
                }

                return [plugin.meta, settings];
              })
              .filter(isNonNullable)
              .sort(([a], [b]) =>
                (a.profile.name ?? a.profile.key).localeCompare(b.profile.name ?? b.profile.key, undefined, {
                  sensitivity: 'base',
                }),
              )
              .map(([meta, settings]: [Plugin$.Meta, AppCapabilities.Settings]) =>
                AppGraphNode.make({
                  id: `${SettingsPath.SETTINGS_KEY}:${meta.profile.key.replaceAll('/', ':')}`,
                  type: 'category',
                  data: settings,
                  properties: {
                    label: meta.profile.name ?? meta.profile.key,
                    // The plugin's own hue is dropped so the settings list reads as one uniform group.
                    icon: meta.profile.icon?.key ?? 'ph--circle--regular',
                    testId: `settings.${meta.profile.key}`,
                  },
                }),
              ),
          );
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
