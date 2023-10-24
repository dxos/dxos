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
import { createApp, Surface } from '@dxos/app-framework';
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
  return <Surface role='main' data={{ active: object }} />;
};

const SketchPluginStoryPlugin = () => ({
  meta: {
    id: 'dxos.org/plugin/sketch-story',
  },
  provides: {
    root: DefaultSketchPluginStory,
  },
});

const SketchSurfacesApp = createApp({ plugins: [ThemePlugin(), SketchPlugin(), SketchPluginStoryPlugin()] });

export default {
  component: SketchSurfacesApp,
};

export const Default = {
  decorators: [FullscreenDecorator()],
  args: {},
};
