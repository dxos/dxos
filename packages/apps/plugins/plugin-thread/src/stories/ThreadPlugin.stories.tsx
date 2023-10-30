//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { ClientPlugin } from '@braneframe/plugin-client';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { Surface, createApp } from '@dxos/app-framework';
import { Config } from '@dxos/client';

import { ThreadPlugin } from '../ThreadPlugin';
import { FullscreenDecorator, createThread } from '../testing';

faker.seed(7);

const DefaultThreadPluginStory = () => {
  const object = createThread();

  return <Surface role='main' data={{ active: object }} />;
};

const ThreadPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/thread-story',
  },
  provides: {
    root: DefaultThreadPluginStory,
  },
});

const ThreadSurfacesApp = createApp({
  plugins: [ClientPlugin({ config: new Config() }), ThemePlugin(), ThreadPlugin(), ThreadPluginStoryPlugin()],
});

export default {
  decorators: [FullscreenDecorator('bg-neutral-200 dark:bg-neutral-800')],
  component: ThreadSurfacesApp,
};

export const Default = {
  args: {},
};
