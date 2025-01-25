//
// Copyright 2024 DXOS.org
//

import { type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import {
  contributes,
  defineModule,
  definePlugin,
  Capabilities,
  Events,
  type Plugin,
  PluginManager,
  PluginManagerProvider,
  Surface,
  createSurface,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

const TestPlugin = definePlugin({ id: 'dxos.org/plugin/test' }, [
  defineModule({
    id: 'dxos.org/module/test',
    activatesOn: Events.Startup,
    activate: () =>
      contributes(Capabilities.ReactSurface, [
        createSurface({
          id: 'dxos.org/surface/test',
          role: 'main',
          component: () => <div>Test</div>,
        }),
      ]),
  }),
]);

const plugins: Plugin[] = [TestPlugin];
const pluginLoader = (id: string) => {
  const plugin = plugins.find((plugin) => plugin.meta.id === id);
  invariant(plugin, `Plugin not found: ${id}`);
  return plugin;
};

const Render = () => {
  const manager = useMemo(() => {
    return new PluginManager({ plugins: [TestPlugin], enabled: [TestPlugin.meta.id], pluginLoader });
  }, []);

  // TODO(burdon): Create storybook decorator.
  return (
    <PluginManagerProvider value={manager}>
      <Surface role='main' />
    </PluginManagerProvider>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-canvas/surface',
  render: Render,
  decorators: [withTheme, withAttention, withLayout({ fullscreen: true, tooltips: true })],
};

export default meta;

export const Default = {};
