//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { View as ViewType, types } from '@braneframe/types';
import { mx } from '@dxos/aurora-theme';
import { range, TestObjectGenerator } from '@dxos/echo-generator';
import { useClient } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { ExplorerMain } from './ExplorerMain';

// Plugins
// TODO(burdon): Search context.
// TODO(burdon): Get space from active node (not graph).
// TODO(burdon): Plugin utils (e.g., create object).

// Tools
// TODO(burdon): Async load fails and crashes app when offline.

// TODO(burdon): Standardize ViewType for Explorer, Table, Kanban, Grid, etc.
// TODO(burdon): Standardize surfaces (i.e., PluginComponentProps); rename react-surface => react-plugin; framework naming.
// TODO(burdon): Standardize plugin surface binding (fooMain pattern vs. pure components).
// TODO(burdon): Client schema/types (post initialize).
// TODO(burdon): Get space from TypedObject.
// TODO(burdon): Plugin deps (deps vs. peerDeps?)
// TODO(burdon): Reconcile echo-generator.
// TODO(burdon): Standardize storybooks (config, component/render props).
// TODO(burdon): Reconcile story utils and config (e.g., FullscreenDecorator).
// TODO(burdon): Reconcile test space decorator.

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
