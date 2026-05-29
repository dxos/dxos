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

type DefaultStoryProps = { variant: ExplorerArticleVariant };

const DefaultStory = ({ variant }: DefaultStoryProps) => {
  const [space] = useSpaces();
  const [graph] = useQuery(space?.db, Filter.type(Graph.Graph));
  if (!space || !graph) {
    return <Loading data={{ space: !!space, graph: !!graph }} />;
  }

  return <ExplorerArticle role='article' subject={graph as any} attendableId={graph.id} variant={variant} />;
};

const meta: Meta<DefaultStoryProps> = {
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
            HasRelationship.HasRelationship,
            Organization.Organization,
            Person.Person,
            Pipeline.Pipeline,
            View.View,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              // Denser HasRelationship graph so the plexus variant shows multiple relation
              // groups (organization ref + relationships) fanning out from a focused person.
              yield* Effect.promise(() =>
                generate(personalSpace, generator, { relations: [{ kind: 'friend', count: 40 }] }),
              );

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

type Story = StoryObj<typeof meta>;

export const Force: Story = {
  args: {
    variant: 'force',
  },
};

export const Cluster: Story = {
  args: {
    variant: 'cluster',
  },
};

export const Bundle: Story = {
  args: {
    variant: 'bundle',
  },
};

export const Plexus: Story = {
  args: {
    variant: 'plexus',
  },
};

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
