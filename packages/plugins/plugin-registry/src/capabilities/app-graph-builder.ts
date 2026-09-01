//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { DXN } from '@dxos/keys';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { LOAD_PLUGIN_DIALOG, type RegistryPluginOptions } from '#types';

import { getCategoryPredicate, getPopulatedCategories, getRemotePluginIds } from '../categories';
import { REGISTRY_ID } from '../paths';

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
  Effect.fnUntraced(function* ({ externalPlugins = true }: RegistryPluginOptions = {}) {
    // Hoisted so connector bodies read reactively via `get(...)` instead of a sync
    // `Capability.get`, establishing a dependency that heals once the capability lands.
    const pluginManagerAtom = yield* Capability.atom(Capabilities.PluginManager);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'openRegistry',
        match: GraphNodeMatcher.whenRoot,
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
      AppGraphBuilder.createExtension({
        id: 'registry',
        match: GraphNodeMatcher.whenRoot,
        // REGISTRY_ID is a pinned workspace (the URL's workspace anchor), so it carries no key of its
        // own; its category and plugin children are the addressable planks (see `categories`/`plugins`).
        connector: () =>
          Effect.succeed([
            AppGraphNode.make({
              id: REGISTRY_ID,
              type: meta.profile.key,
              properties: {
                label: ['plugin-registry.label', { ns: meta.profile.key }],
                icon: 'ph--squares-four--regular',
                disposition: 'pin-end',
                position: Position.first,
                testId: 'treeView.pluginRegistry',
              },
            }),
          ]),
      }),
      AppGraphBuilder.createExtension({
        id: 'categories',
        url: { key: 'category', kind: 'item', path: [] },
        match: GraphNodeMatcher.whenId(`root/${REGISTRY_ID}`),
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
          const categoryCount = (category: string) => {
            if (category !== 'registry') {
              return plugins.filter(getCategoryPredicate(category, filterContext)).length;
            }
            return externalPlugins ? get(manager.pluginRegistry.plugins).entries.length : 0;
          };

          return Effect.succeed(
            getPopulatedCategories(categoryCount).map(({ id, labelKey, icon, testId, count }) =>
              AppGraphNode.make({
                id,
                type: 'category',
                data: id,
                properties: {
                  label: [labelKey, { ns: meta.profile.key }],
                  icon,
                  testId,
                  count,
                },
              }),
            ),
          );
        },
      }),
      ...(externalPlugins
        ? [
            AppGraphBuilder.createExtension({
              id: 'actions',
              match: GraphNodeMatcher.whenId(`root/${REGISTRY_ID}`),
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
          ]
        : []),
      AppGraphBuilder.createExtension({
        id: 'plugins',
        url: { key: 'registry', kind: 'item', path: [] },
        match: GraphNodeMatcher.whenId(`root/${REGISTRY_ID}`),
        connector: (_node, get) => {
          const [manager] = get(pluginManagerAtom);
          if (!manager) {
            return Effect.succeed([]);
          }
          const installedIds = new Set(manager.getPlugins().map((plugin) => plugin.meta.profile.key));

          const installedNodes = manager.getPlugins().map((plugin) =>
            AppGraphNode.make({
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

          const registryEntries = externalPlugins ? get(manager.pluginRegistry.plugins).entries : [];
          const registryNodes = registryEntries
            // `profile.key` is the bare NSID on both sides; comparing against a `dxn:`-prefixed
            // URI here would never match and would duplicate every installed plugin's node.
            .filter((entry) => !installedIds.has(entry.profile.key))
            .map((entry) => {
              const plugin = toDisplayPlugin(entry);
              return AppGraphNode.make({
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
