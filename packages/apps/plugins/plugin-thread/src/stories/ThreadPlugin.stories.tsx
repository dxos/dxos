//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { ClientPlugin } from '@braneframe/plugin-client';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { Config } from '@dxos/client';
import { PluginProvider, Surface } from '@dxos/app-framework';

import { ThreadPlugin } from '../ThreadPlugin';
import { FullscreenDecorator, createThread } from '../testing';

faker.seed(7);

const DefaultThreadPluginStory = () => {
  const object = createThread();

  // TODO(burdon): Why array? Should first be space?
  return <Surface role='main' data={[object, object]} />;
};

const ThreadPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/thread-story',
  },
  provides: {
    components: {
      default: DefaultThreadPluginStory,
    },
  },
});

const ThreadSurfacesApp = () => (
  <PluginProvider
    plugins={[ClientPlugin({ config: new Config() }), ThemePlugin(), ThreadPlugin(), ThreadPluginStoryPlugin()]}
  />
);

export default {
  decorators: [FullscreenDecorator('bg-neutral-200 dark:bg-neutral-800')],
  component: ThreadSurfacesApp,
};

export const Default = {
  args: {},
};
