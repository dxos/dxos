//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React from 'react';

import { ClientPlugin } from '@braneframe/plugin-client';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { mx } from '@dxos/react-ui-theme';
import { Config } from '@dxos/client';
import { PluginProvider, Surface } from '@dxos/react-surface';

import { createThread } from './testing';
import { ThreadPlugin } from '../ThreadPlugin';

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
  component: ThreadSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator('bg-zinc-200 dark:bg-zinc-800')],
  args: {},
};
