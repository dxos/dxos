//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { Drawing as DrawingType } from '@braneframe/types';
import { mx } from '@dxos/aurora-theme';
import { PluginContextProvider, Surface } from '@dxos/react-surface';

import { DrawingPlugin } from '../DrawingPlugin';

faker.seed(7);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const DefaultDrawingPluginStory = () => {
  const object = new DrawingType({});
  return <Surface role='main' data={[object, object]} />;
};

const DrawingPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/DrawingPluginStoryPlugin',
  },
  provides: {
    components: {
      default: DefaultDrawingPluginStory,
    },
  },
});

const DrawingSurfacesApp = () => (
  <PluginContextProvider plugins={[ThemePlugin(), DrawingPlugin(), DrawingPluginStoryPlugin()]} />
);

export default {
  component: DrawingSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator()],
  args: {},
};
