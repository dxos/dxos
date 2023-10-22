//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { View as ViewType, types } from '@braneframe/types';
import { range, TestObjectGenerator } from '@dxos/echo-generator';
import { useClient } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { mx } from '@dxos/react-ui-theme';

import { ExplorerMain } from './ExplorerMain';

faker.seed(1);
const generator = new TestObjectGenerator();

// TODO(burdon): Factor out.
const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer, any> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
      <Story />
    </div>
  );
};

const Story = () => {
  const client = useClient();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;
    const view = space.db.add(new ViewType({}));
    const factory = generator.factories.project;
    const objects = range(factory.createObject, 10);
    objects.forEach((object) => space.db.add(object));
    setView(view);
  }, []);

  if (!view) {
    return null;
  }

  // TODO(burdon): Create storybook util with surface.
  return <ExplorerMain data={view} />;
};

export default {
  component: ExplorerMain,
  render: Story,
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      schema: types,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
