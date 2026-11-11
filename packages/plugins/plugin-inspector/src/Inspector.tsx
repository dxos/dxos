//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import type * as Plugin from '@dxos/app-framework/Plugin';
import { PluginManagerHost } from '@dxos/app-framework/testing';
import * as UrlLoader from '@dxos/app-framework/UrlLoader';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';

import { InspectorPlugin } from './InspectorPlugin.tsx';
import { type KindId } from './kinds.ts';

export type InspectorProps = {
  /** The plugin to inspect, e.g. `make()` from its `dx.config.ts`. */
  plugin?: Plugin.Plugin;
  /** A dev server's manifest, for the reader to load their own plugin from instead. */
  manifestUrl?: string;
  /** The kinds of module a learning-path page adds, checked against the plugin. */
  adds?: readonly KindId[];
};

/**
 * A PLEX app that loads one plugin, beside the plugins Composer would give it, on an in-memory client with an identity
 * and a space, and shows each of its modules working.
 */
export const Inspector = ({ plugin, manifestUrl, adds }: InspectorProps) => {
  const id = `${plugin?.meta.profile.key ?? manifestUrl}:${adds?.join(',')}`;
  const options = useMemo(
    () => ({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          onClientInitialized: ({ client }) => initializeIdentity(client).pipe(Effect.asVoid),
        }),
        SpacePlugin.make({}),
        StorybookPlugin.make({}),
        InspectorPlugin({ pluginId: plugin?.meta.profile.key, manifestUrl, adds }),
        ...(plugin ? [plugin] : []),
      ],
      pluginLoader: UrlLoader.make([]),
    }),
    // The manager is rebuilt only for another plugin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  return <PluginManagerHost id={id} options={options} />;
};
