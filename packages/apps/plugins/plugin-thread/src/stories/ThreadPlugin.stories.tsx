//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { ClientPlugin } from '@braneframe/plugin-client';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { mx } from '@dxos/aurora-theme';
import { Config } from '@dxos/client';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { ThreadPlugin } from '../ThreadPlugin';
import { createThread } from './testing';

faker.seed(7);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const DefaultThreadPluginStory = () => {
  const object = createThread();
  // TODO(burdon): Why array? Should first be space?
  return <Surface role='main' data={[object, object]} />;
};

const ThreadPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/ThreadPluginStoryPlugin', // TODO(burdon): Consistent GUID? (see stack).
  },
  provides: {
    components: {
      default: DefaultThreadPluginStory,
    },
  },
});

const ThreadSurfacesApp = () => (
  <PluginContextProvider
    plugins={[ClientPlugin({ config: new Config() }), ThemePlugin(), ThreadPlugin(), ThreadPluginStoryPlugin()]}
  />
);

export default {
  component: ThreadSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator('bg-zinc-200 dark:bg-zinc-800')],
  args: {},
};
