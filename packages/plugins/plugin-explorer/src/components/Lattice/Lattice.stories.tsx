//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Type, View } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { type SpaceGraphNode, ViewModel } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory, createRelationFactory } from '@dxos/schema/testing';
import { HasRelationship, Organization, Person, Pipeline } from '@dxos/types';

import { useGraphModel } from '#hooks';
import { Graph } from '#types';

import { Lattice } from './Lattice';

const generator = random as any as ValueGenerator;

random.seed(7);

const EMPTY_ATOM = Atom.make<{ nodes: SpaceGraphNode[] }>({ nodes: [] });

const DefaultStory = () => {
  const [space] = useSpaces();
  const model = useGraphModel(space?.db);
  const graphSnapshot = useAtomValue((model?.graphAtom ?? EMPTY_ATOM) as typeof EMPTY_ATOM);
  const nodes = useMemo(() => graphSnapshot.nodes.filter((node) => node.type === 'object'), [graphSnapshot]);

  if (!space || !model) {
    return <Loading data={{ space: !!space, model: !!model }} />;
  }

  return <Lattice nodes={nodes} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-explorer/components/Lattice',
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
              yield* Effect.promise(() =>
                createObjectFactory(
                  personalSpace.db,
                  generator,
                )([
                  { type: Organization.Organization, count: 20 },
                  { type: Person.Person, count: 30 },
                  { type: Pipeline.Pipeline, count: 10 },
                ]),
              );
              yield* Effect.promise(() =>
                createRelationFactory(
                  personalSpace.db,
                  generator,
                )([{ type: HasRelationship.HasRelationship, count: 20, data: { kind: 'friend' } }]),
              );
              const { view } = yield* Effect.promise(() =>
                ViewModel.makeFromDatabase({ db: personalSpace.db, typename: Type.getTypename(Graph.Graph) }),
              );
              personalSpace.db.add(Graph.make({ name: 'Test', view }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
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

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};
