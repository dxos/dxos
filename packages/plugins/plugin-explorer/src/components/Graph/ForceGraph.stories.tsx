//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { View } from '@dxos/schema';
import { type ValueGenerator } from '@dxos/schema/testing';
import { render } from '@dxos/storybook-utils';
import { HasRelationship, Organization, Person, Project } from '@dxos/types';

import { useGraphModel } from '../../hooks';
import { Graph } from '../../types';

import { ForceGraph } from './ForceGraph';
import { generate } from './testing';

const generator = faker as any as ValueGenerator;

faker.seed(1);

const DefaultStory = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  const [graph, setGraph] = useState<Graph.Graph>();

  useAsyncEffect(async () => {
    const space = client.spaces.default;
    void generate(space, generator);
    const { view } = await View.makeFromSpace({ client, space, typename: Type.getTypename(Graph.Graph) });
    const graph = Graph.make({ name: 'Test', view });
    space.db.add(graph);
    setSpace(space);
    setGraph(graph);
  }, []);

  const model = useGraphModel(space);
  if (!model || !space || !graph) {
    return null;
  }

  return <ForceGraph model={model} />;
};

const meta = {
  title: 'plugins/plugin-explorer/ForceGraph',
  component: ForceGraph,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withClientProvider({
      createSpace: true,
      types: [
        Graph.Graph,
        View.View,
        HasRelationship.HasRelationship,
        Organization.Organization,
        Project.Project,
        Person.Person,
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ForceGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
