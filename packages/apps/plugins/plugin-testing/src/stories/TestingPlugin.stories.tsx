//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { Testing as TestingType } from '@braneframe/types';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { TestingPlugin } from '../TestingPlugin';

const DefaultTestingPluginStory = () => {
  const object = new TestingType({});
  return <Surface role='main' data={[object, object]} />;
};

const TestingPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/TestingPluginStoryPlugin',
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
  args: {},
};
