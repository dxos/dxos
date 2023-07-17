//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { Testing as TestingType } from '@braneframe/types';
import { mx } from '@dxos/aurora-theme';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { TestingPlugin } from '../TestingPlugin';

faker.seed(7);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const DefaultTestingPluginStory = () => {
  const object = new TestingType({});
  return <Surface role='main' data={[object, object]} />;
};

const TestingPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/testing/TestingPluginStoryPlugin',
  },
  provides: {
    components: {
      default: DefaultTestingPluginStory,
    },
  },
});

const TestingSurfacesApp = () => (
  <PluginContextProvider plugins={[ThemePlugin(), TestingPlugin(), TestingPluginStoryPlugin()]} />
);

export default {
  component: TestingSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator()],
  args: {},
};
