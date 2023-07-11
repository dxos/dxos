//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { DndPlugin } from '@braneframe/plugin-dnd';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { ObservableArray, ObservableObject } from '@dxos/observable-object';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { StackPlugin } from '../StackPlugin';

const DefaultStackPluginStory = () => {
  const stack = new ObservableObject({
    id: 'todo',
    sections: new ObservableArray(),
    title: 'Stack storybook title',
  });
  return <Surface role='main' data={[stack, stack]} />;
};

const StackPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos:stackStoryPlugin',
  },
  provides: {
    components: {
      default: DefaultStackPluginStory,
    },
  },
});

const StackSurfacesApp = () => (
  <PluginContextProvider
    plugins={[ThemePlugin(), DndPlugin(), StackPlugin(), MarkdownPlugin(), StackPluginStoryPlugin()]}
  />
);

export default {
  component: StackSurfacesApp,
};

export const Default = {
  args: {},
};
