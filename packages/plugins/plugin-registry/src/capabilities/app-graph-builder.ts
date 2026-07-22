//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { Position } from '@dxos/util';

import { REGISTRY_ID, REGISTRY_KEY, meta, registryCategoryId } from '#meta';

import { getCategoryPredicate, getRemotePluginIds } from '../categories';
import { LOAD_PLUGIN_DIALOG } from '../containers';

/**
 * Turns a registry catalog entry into a minimal {@link Plugin.Plugin} so it
 * can be attached as the graph node's `data`. The synthesized plugin has no
 * modules and only exists so the article surface can render details for
 * registry plugins that haven't been installed yet.
 */
const toDisplayPlugin = (entry: Plugin.Meta): Plugin.Plugin =>
  ({
    [Plugin.PluginTypeId]: Plugin.PluginTypeId,
    meta: Plugin.makeMeta({
      key: DXN.make(entry.profile.key),
      name: entry.profile.name,
      description: entry.profile.description,
      homePage: entry.profile.homePage,
      source: entry.profile.source,
      screenshots: entry.profile.screenshots,
      tags: entry.profile.tags,
      icon: entry.profile.icon,
      author: entry.profile.author,
    }),
    modules: [],
  }) as Plugin.Plugin;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Hoisted so connector bodies read reactively via `get(...)` instead of a sync
    // `Capability.get`, establishing a dependency that heals once the capability lands.
    const pluginManagerAtom = yield* Capability.atom(Capabilities.PluginManager);

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'openRegistry',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: 'openRegistry',
              data: () => Operation.invoke(SettingsOperation.OpenPluginRegistry),
              properties: {
                label: ['open-plugin-registry.label', { ns: meta.profile.key }],
                icon: 'ph--squares-four--regular',
                disposition: 'menu',
              },
            },
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'registry',
        match: NodeMatcher.whenRoot,
        connector: (_node, get) => {
          const [manager] = get(pluginManagerAtom);
          if (!manager) {
            return Effect.succeed([]);
          }
          const plugins = get(manager.plugins);
          const filterContext = {
            core: get(manager.core),
            enabled: get(manager.enabled),
            remoteIds: getRemotePluginIds(),
          };
          const categoryCount = (category: string) =>
            plugins.filter(getCategoryPredicate(category, filterContext)).length;
          const registryCount = get(manager.pluginRegistry.plugins).entries.length;

          return Effect.succeed([
            Node.make({
              id: REGISTRY_ID,
              type: meta.profile.key,
              properties: {
                label: ['plugin-registry.label', { ns: meta.profile.key }],
                icon: 'ph--squares-four--regular',
                disposition: 'pin-end',
                position: Position.first,
                testId: 'treeView.pluginRegistry',
              },
              nodes: [
                Node.make({
                  id: registryCategoryId('bundled'),
                  type: 'category',
                  data: registryCategoryId('bundled'),
                  properties: {
                    label: ['bundled-plugins.label', { ns: meta.profile.key }],
                    icon: 'ph--squares-four--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.bundled',
                    count: categoryCount(registryCategoryId('bundled')),
                  },
                }),
                Node.make({
                  id: registryCategoryId('installed'),
                  type: 'category',
                  data: registryCategoryId('installed'),
                  properties: {
                    label: ['installed-plugins.label', { ns: meta.profile.key }],
                    icon: 'ph--check--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.installed',
                    count: categoryCount(registryCategoryId('installed')),
                  },
                }),
                Node.make({
                  id: registryCategoryId('recommended'),
                  type: 'category',
                  data: registryCategoryId('recommended'),
                  properties: {
                    label: ['recommended-plugins.label', { ns: meta.profile.key }],
                    icon: 'ph--star--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.recommended',
                    count: categoryCount(registryCategoryId('recommended')),
                  },
                }),
                Node.make({
                  id: registryCategoryId('labs'),
                  type: 'category',
                  data: registryCategoryId('labs'),
                  properties: {
                    label: ['labs-plugins.label', { ns: meta.profile.key }],
                    icon: 'ph--flask--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.labs',
                    count: categoryCount(registryCategoryId('labs')),
                  },
                }),
                ...(registryCount > 0
                  ? [
                      Node.make({
                        id: registryCategoryId('registry'),
                        type: 'category',
                        data: registryCategoryId('registry'),
                        properties: {
                          label: ['registry-plugins.label', { ns: meta.profile.key }],
                          icon: 'ph--users-three--regular',
                          key: REGISTRY_KEY,
                          testId: 'pluginRegistry.registry',
                          count: registryCount,
                        },
                      }),
                    ]
                  : []),
              ],
            }),
          ]);
        },
      }),
      GraphBuilder.createExtension({
        id: 'actions',
        match: NodeMatcher.whenId(`root/${REGISTRY_ID}`),
        actions: () =>
          Effect.succeed([
            {
              id: 'loadByUrl',
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: LOAD_PLUGIN_DIALOG,
                  state: true,
                });
              }),
              properties: {
                label: ['load-by-url.label', { ns: meta.profile.key }],
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
          const [manager] = get(pluginManagerAtom);
          if (!manager) {
            return Effect.succeed([]);
          }
          const installedIds = new Set(manager.getPlugins().map((plugin) => plugin.meta.profile.key));

          const installedNodes = manager.getPlugins().map((plugin) =>
            Node.make({
              id: plugin.meta.profile.key,
              type: 'org.dxos.plugin',
              data: plugin,
              properties: {
                label: plugin.meta.profile.name ?? plugin.meta.profile.key,
                icon: plugin.meta.profile.icon?.key ?? 'ph--circle--regular',
                disposition: 'hidden',
              },
            }),
          );

          const registryEntries = get(manager.pluginRegistry.plugins).entries;
          const registryNodes = registryEntries
            .filter((entry) => !installedIds.has(DXN.make(entry.profile.key)))
            .map((entry) => {
              const plugin = toDisplayPlugin(entry);
              return Node.make({
                id: plugin.meta.profile.key,
                type: 'org.dxos.plugin',
                data: plugin,
                properties: {
                  label: plugin.meta.profile.name ?? plugin.meta.profile.key,
                  icon: plugin.meta.profile.icon?.key ?? 'ph--circle--regular',
                  disposition: 'hidden',
                },
              });
            });

          return Effect.succeed([...installedNodes, ...registryNodes]);
        },
      }),
    ]);

    return Capability.provide(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
