//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import * as Plugin from '@dxos/app-framework/Plugin';
import { PluginManagerHost } from '@dxos/app-framework/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';

import { InspectorPlugin } from './InspectorPlugin.tsx';
import { type LayoutProps } from './Layout.tsx';
import { moduleName } from './panels/common.tsx';

export type InspectorProps = Omit<LayoutProps, 'pluginId'> & {
  /** The plugin to inspect, e.g. `make()` from its `dx.config.ts`. */
  plugin: Plugin.Plugin;
  /** Names of the modules to load, for a plugin only partly written; every module when absent. */
  modules?: readonly string[];
};

/**
 * A PLEX app that loads one plugin, beside the plugins Composer would give it, on an in-memory client with an identity
 * and a space, and shows what the framework loaded and created from it.
 */
export const Inspector = ({ plugin, modules, ...layout }: InspectorProps) => {
  const id = `${plugin.meta.profile.key}:${modules?.join(',') ?? '*'}`;
  const options = useMemo(
    () => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          onClientInitialized: ({ client }) => initializeIdentity(client).pipe(Effect.asVoid),
        }),
        SpacePlugin.make({}),
        StorybookPlugin.make({}),
        InspectorPlugin({ pluginId: plugin.meta.profile.key, ...layout }),
        modules ? withModules(plugin, modules) : plugin,
      ],
    }),
    // The manager is rebuilt only for another plugin or stage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  return <PluginManagerHost id={id} options={options} />;
};

/** `plugin` with only the modules named, loaded when the manager loads it. */
const withModules = (plugin: Plugin.Plugin, names: readonly string[]): Plugin.Plugin =>
  Plugin.lazy(plugin.meta, async () => {
    const { meta, modules } = await EffectEx.runPromise(Plugin.resolveLazy(plugin));
    const builder = modules
      .filter((module) => names.includes(moduleName(module.id)))
      .reduce(
        (builder, module) =>
          builder.addModule({
            id: moduleName(module.id),
            ...module.activation,
            activate: module.activate,
            load: module.load,
          }),
        Plugin.define(meta),
      );
    return { default: Plugin.make(builder) };
  })();
