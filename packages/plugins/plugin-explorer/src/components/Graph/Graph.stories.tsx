//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { live } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme, render } from '@dxos/storybook-utils';

import { Graph } from './Graph';
import { ViewType } from '../../types';

faker.seed(1);

const DefaultStory = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;
    const generator = createSpaceObjectGenerator(space);
    queueMicrotask(async () => {
      await generator.addSchemas();
      await generator.createObjects({
        [TestSchemaType.organization]: 10,
        [TestSchemaType.contact]: 30,
      });
    });

    const view = space.db.add(live(ViewType, { name: '', type: '' }));
    setSpace(space);
    setView(view);
  }, []);

  if (!space || !view) {
    return null;
  }

  return <Graph space={space} />;
};

const meta: Meta = {
  title: 'plugins/plugin-explorer/Graph',
  component: Graph,
  render: render(DefaultStory),
  decorators: [
    withClientProvider({ createSpace: true, types: [ViewType] }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {};
