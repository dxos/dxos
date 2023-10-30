//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { createApp, Surface } from '@dxos/app-framework';
import { mx } from '@dxos/react-ui-theme';

import { createKanban } from './testing';
import { KanbanPlugin } from '../KanbanPlugin';

faker.seed(7);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const DefaultKanbanPluginStory = () => {
  const object = createKanban();
  return <Surface role='main' data={{ active: object }} />;
};

const KanbanPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/kanban-story',
  },
  provides: {
    root: DefaultKanbanPluginStory,
  },
});

const KanbanSurfacesApp = createApp({ plugins: [ThemePlugin(), KanbanPlugin(), KanbanPluginStoryPlugin()] });

export default {
  component: KanbanSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator()],
  args: {},
};
