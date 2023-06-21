//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { ObservableObject } from '@dxos/observable-object';
import { PluginContextProvider, Surface, ThemePlugin } from '@dxos/react-surface';

import { StackPlugin } from '../StackPlugin';

const DefaultStackPluginStory = () => {
  const stack = new ObservableObject({
    id: 'todo',
    sections: [],
    title: 'Stack storybook title',
  });
  return <Surface role='main' data={[stack, stack]} />;
};

const StackPluginStoryPlugin = {
  meta: {
    id: 'dxos:stackStoryPlugin',
  },
  provides: {
    components: {
      default: DefaultStackPluginStory,
    },
  },
};

const StackSurfacesApp = () => <PluginContextProvider plugins={[ThemePlugin, StackPlugin, StackPluginStoryPlugin]} />;

export default {
  component: StackSurfacesApp,
};

export const Default = {
  args: {},
};
