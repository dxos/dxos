//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { Sketch as SketchType } from '@braneframe/types';
import { PluginProvider, Surface } from '@dxos/react-surface';
import { mx } from '@dxos/react-ui-theme';

import { SketchPlugin } from '../SketchPlugin';

faker.seed(7);

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const DefaultSketchPluginStory = () => {
  const object = new SketchType({});
  return <Surface role='main' data={[object, object]} />;
};

const SketchPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/sketch-story',
  },
  provides: {
    components: {
      default: DefaultSketchPluginStory,
    },
  },
});

const SketchSurfacesApp = () => <PluginProvider plugins={[ThemePlugin(), SketchPlugin(), SketchPluginStoryPlugin()]} />;

export default {
  component: SketchSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator()],
  args: {},
};
