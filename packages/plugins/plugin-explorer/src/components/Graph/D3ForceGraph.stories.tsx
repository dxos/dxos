//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { type ValueGenerator } from '@dxos/schema/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';

import { useGraphModel } from '../../hooks';
import { ViewType } from '../../types';

import { D3ForceGraph } from './D3ForceGraph';
import { generate } from './testing';

const generator = faker as any as ValueGenerator;

faker.seed(1);

const DefaultStory = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [view, setView] = useState<ViewType>();
  useEffect(() => {
    const space = client.spaces.default;
    void generate(space, generator);
    const view = space.db.add(Obj.make(ViewType, { name: '', type: '' }));
    setSpace(space);
    setView(view);
  }, []);

  const model = useGraphModel(space);
  if (!model || !space || !view) {
    return null;
  }

  return <D3ForceGraph model={model} />;
};

const meta = {
  title: 'plugins/plugin-explorer/D3ForceGraph',
  component: D3ForceGraph,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withClientProvider({
      createSpace: true,
      types: [ViewType, DataType.Organization, DataType.Project, DataType.Person, DataType.HasRelationship],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof D3ForceGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
