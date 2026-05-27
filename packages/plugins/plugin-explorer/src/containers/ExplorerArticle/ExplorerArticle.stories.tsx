//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Query, Type, View } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { ViewModel } from '@dxos/schema';
import { type ValueGenerator } from '@dxos/schema/testing';
import { HasRelationship, Organization, Person, Pipeline } from '@dxos/types';

import { generate } from '../../testing';
import { Graph } from '../../types';
import { ExplorerArticle, type ExplorerArticleVariant } from './ExplorerArticle';

const generator = random as any as ValueGenerator;

random.seed(7);

type StoryArgs = { variant: ExplorerArticleVariant };

const DefaultStory = ({ variant }: StoryArgs) => {
  const [space] = useSpaces();
  const [graph] = useQuery(space?.db, Filter.type(Graph.Graph));
  if (!space || !graph) {
    return <Loading data={{ space: !!space, graph: !!graph }} />;
  }

  return <ExplorerArticle role='article' subject={graph as any} attendableId={graph.id} variant={variant} />;
};

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-explorer/containers/ExplorerArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [
            Graph.Graph,
            View.View,
            HasRelationship.HasRelationship,
            Organization.Organization,
            Pipeline.Pipeline,
            Person.Person,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => generate(personalSpace, generator));
              const { view } = yield* Effect.promise(() =>
                ViewModel.makeFromDatabase({
                  db: personalSpace.db,
                  typename: Type.getTypename(Graph.Graph),
                }),
              );

              const graph = personalSpace.db.add(
                Graph.make({
                  name: 'Root',
                  view,
                  query: {
                    ast: Query.select(Filter.everything()).ast,
                  },
                }),
              );

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              return graph;
            }),
        }),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Default force-directed view (the production layout).
 */
export const Force: Story = {
  args: {
    variant: 'force',
  },
};

/**
 * Radial cluster: every object on the perimeter, grouped by its schema, all under a single database root.
 * Inspired by https://observablehq.com/@d3/radial-cluster.
 */
export const Cluster: Story = {
  args: {
    variant: 'cluster',
  },
};

/**
 * Hierarchical edge bundling: same hierarchy as `cluster`, with bundled curves
 * routed through the lowest common ancestor for every relation / ref in the space.
 * Inspired by https://observablehq.com/@d3/hierarchical-edge-bundling.
 */
export const Bundle: Story = {
  args: {
    variant: 'bundle',
  },
};

/**
 * Lattice: every object as a cell in a square-as-possible CSS grid, sorted by typename so
 * objects of the same type cluster together. Each cell is colored by its typename.
 */
export const Lattice: Story = {
  args: {
    variant: 'lattice',
  },
};

export const Swarm: Story = {
  args: {
    variant: 'swarm',
  },
};
