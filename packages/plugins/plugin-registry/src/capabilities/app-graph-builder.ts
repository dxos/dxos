//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { type PluginEntry } from '@dxos/protocols';

import { REGISTRY_ID, REGISTRY_KEY, registryCategoryId, meta } from '#meta';
import { RegistryCapabilities } from '#types';

import { LOAD_PLUGIN_DIALOG } from '../containers';

/**
 * Turns a community manifest entry into a minimal {@link Plugin.Plugin} so it
 * can be attached as the graph node's `data`. The synthesized plugin has no
 * modules and only exists so the article surface can render details for
 * community plugins that haven't been installed yet.
 */
const toDisplayPlugin = (entry: PluginEntry): Plugin.Plugin =>
  ({
    [Plugin.PluginTypeId]: Plugin.PluginTypeId,
    meta: entry.meta,
    modules: [],
  }) as Plugin.Plugin;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'open-registry',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: 'open-registry',
              data: () => Operation.invoke(SettingsOperation.OpenPluginRegistry),
              properties: {
                label: ['open-plugin-registry.label', { ns: meta.id }],
                icon: 'ph--squares-four--regular',
                disposition: 'menu',
              },
            },
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'registry',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            Node.make({
              id: REGISTRY_ID,
              type: meta.id,
              properties: {
                label: ['plugin-registry.label', { ns: meta.id }],
                icon: 'ph--squares-four--regular',
                disposition: 'pin-end',
                testId: 'treeView.pluginRegistry',
              },
              nodes: [
                Node.make({
                  id: registryCategoryId('official'),
                  type: 'category',
                  data: registryCategoryId('official'),
                  properties: {
                    label: ['official-plugins.label', { ns: meta.id }],
                    icon: 'ph--squares-four--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.official',
                  },
                }),
                Node.make({
                  id: registryCategoryId('installed'),
                  type: 'category',
                  data: registryCategoryId('installed'),
                  properties: {
                    label: ['installed-plugins.label', { ns: meta.id }],
                    icon: 'ph--check--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.installed',
                  },
                }),
                Node.make({
                  id: registryCategoryId('recommended'),
                  type: 'category',
                  data: registryCategoryId('recommended'),
                  properties: {
                    label: ['recommended-plugins.label', { ns: meta.id }],
                    icon: 'ph--star--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.recommended',
                  },
                }),
                Node.make({
                  id: registryCategoryId('labs'),
                  type: 'category',
                  data: registryCategoryId('labs'),
                  properties: {
                    label: ['labs-plugins.label', { ns: meta.id }],
                    icon: 'ph--flask--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.labs',
                  },
                }),
                Node.make({
                  id: registryCategoryId('community'),
                  type: 'category',
                  data: registryCategoryId('community'),
                  properties: {
                    label: ['community-plugins.label', { ns: meta.id }],
                    icon: 'ph--users-three--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.community',
                  },
                }),
              ],
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'actions',
        match: NodeMatcher.whenId(`root/${REGISTRY_ID}`),
        actions: () =>
          Effect.succeed([
            {
              id: 'load-by-url',
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: LOAD_PLUGIN_DIALOG,
                  state: true,
                });
              }),
              properties: {
                label: ['load-by-url.label', { ns: meta.id }],
                icon: 'ph--cloud-arrow-down--regular',
                disposition: 'list-item-primary',
              },
            },
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'plugins',
        match: NodeMatcher.whenId(`root/${REGISTRY_ID}`),
        connector: (_node, get) => {
          const manager = capabilities.get(Capabilities.PluginManager);
          const installedIds = new Set(manager.getPlugins().map((plugin) => plugin.meta.id));
          const stateAtom = capabilities.getAll(RegistryCapabilities.State).at(0);

          const installedNodes = manager.getPlugins().map((plugin) =>
            Node.make({
              id: plugin.meta.id,
              type: 'org.dxos.plugin',
              data: plugin,
              properties: {
                label: plugin.meta.name ?? plugin.meta.id,
                icon: plugin.meta.icon ?? 'ph--circle--regular',
                disposition: 'hidden',
              },
            }),
          );

          const communityEntries = stateAtom ? get(stateAtom).entries : [];
          const communityNodes = communityEntries
            .filter((entry) => !installedIds.has(entry.meta.id))
            .map((entry) => {
              const plugin = toDisplayPlugin(entry);
              return Node.make({
                id: plugin.meta.id,
                type: 'org.dxos.plugin',
                data: plugin,
                properties: {
                  label: plugin.meta.name ?? plugin.meta.id,
                  icon: plugin.meta.icon ?? 'ph--circle--regular',
                  disposition: 'hidden',
                },
              });
            });

          return Effect.succeed([...installedNodes, ...communityNodes]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
