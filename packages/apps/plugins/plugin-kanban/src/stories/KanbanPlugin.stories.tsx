//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { mx } from '@dxos/aurora-theme';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { KanbanPlugin } from '../KanbanPlugin';
import { createKanban } from './testing';

faker.seed(7);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const DefaultKanbanPluginStory = () => {
  const object = createKanban();
  // TODO(burdon): Why array? Should first be space?
  return <Surface role='main' data={[object, object]} />;
};

const KanbanPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/KanbanPluginStoryPlugin', // TODO(burdon): Consistent GUID? (see stack).
  },
  provides: {
    components: {
      default: DefaultKanbanPluginStory,
    },
  },
});

const KanbanSurfacesApp = () => (
  <PluginContextProvider plugins={[ThemePlugin(), KanbanPlugin(), KanbanPluginStoryPlugin()]} />
);

export default {
  component: KanbanSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator()],
  args: {},
};
