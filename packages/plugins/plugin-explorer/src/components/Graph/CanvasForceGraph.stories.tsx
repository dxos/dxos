//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Type, View } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { ViewModel } from '@dxos/schema';
import { type ValueGenerator } from '@dxos/schema/testing';
import { HasRelationship, Organization, Person, Pipeline } from '@dxos/types';

import { useGraphModel } from '#hooks';
import { Graph } from '#types';

import { CanvasForceGraph } from './CanvasForceGraph';
import { generate } from './testing';

const generator = random as any as ValueGenerator;

random.seed(1);

const DefaultStory = () => {
  const [space] = useSpaces();
  const model = useGraphModel(space);
  if (!space || !model) {
    return <Loading data={{ space: !!space, model: !!model }} />;
  }

  return <CanvasForceGraph model={model} />;
};

const meta = {
  title: 'plugins/plugin-explorer/components/CanvasForceGraph',
  component: CanvasForceGraph,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
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
                ViewModel.makeFromDatabase({ db: personalSpace.db, typename: Type.getTypename(Graph.Graph) }),
              );
              personalSpace.db.add(Graph.make({ name: 'Test', view }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CanvasForceGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
