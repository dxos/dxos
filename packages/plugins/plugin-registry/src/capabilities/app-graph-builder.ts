//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { LOAD_PLUGIN_DIALOG } from '../containers';
import { REGISTRY_ID, REGISTRY_KEY, registryCategoryId, meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: meta.id,
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            {
              id: meta.id,
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
        id: meta.id,
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
                  id: registryCategoryId('all'),
                  type: 'category',
                  data: registryCategoryId('all'),
                  properties: {
                    label: ['all-plugins.label', { ns: meta.id }],
                    icon: 'ph--squares-four--regular',
                    key: REGISTRY_KEY,
                    testId: 'pluginRegistry.all',
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
              ],
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: `${meta.id}.actions`,
        match: NodeMatcher.whenAny(NodeMatcher.whenId(`root/${REGISTRY_ID}`), (node) =>
          node.properties.key === REGISTRY_KEY ? Option.some(node) : Option.none(),
        ),
        actions: () =>
          Effect.succeed([
            {
              id: `${meta.id}.load-by-url`,
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
        id: `${meta.id}.plugins`,
        match: NodeMatcher.whenId(`root/${REGISTRY_ID}`),
        connector: () => {
          const manager = capabilities.get(Capabilities.PluginManager);
          return Effect.succeed(
            manager.getPlugins().map((plugin) =>
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
            ),
          );
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
