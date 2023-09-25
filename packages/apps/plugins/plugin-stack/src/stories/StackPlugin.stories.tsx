//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { DndPlugin } from '@braneframe/plugin-dnd';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { PluginProvider, Surface } from '@dxos/react-surface';

import { StackPlugin } from '../StackPlugin';

const DefaultStackPluginStory = () => {
  const stack = deepSignal({
    id: 'todo',
    sections: [],
    title: 'Stack storybook title',
  });

  return <Surface role='main' data={{ data: { object: stack } }} />;
};

const StackPluginStoryPlugin = () => ({
  meta: {
    id: 'example.com/plugin/stackStoryPlugin',
  },
  provides: {
    components: {
      default: DefaultStackPluginStory,
    },
  },
});

const StackSurfacesApp = () => (
  <PluginProvider plugins={[ThemePlugin(), DndPlugin(), StackPlugin(), MarkdownPlugin(), StackPluginStoryPlugin()]} />
);

export default {
  component: StackSurfacesApp,
};

export const Default = {
  args: {},
};
