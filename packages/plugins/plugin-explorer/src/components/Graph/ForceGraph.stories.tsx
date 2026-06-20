//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Type, View } from '@dxos/echo';
import { SelectionModel } from '@dxos/graph';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { DxAnchorActivate } from '@dxos/react-ui';
import { type GraphProps } from '@dxos/react-ui-graph';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { type SpaceGraphEdge, type SpaceGraphNode, ViewModel } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory, createRelationFactory } from '@dxos/schema/testing';
import { HasRelationship, Organization, Person, Pipeline } from '@dxos/types';

import { useGraphModel } from '#hooks';
import { Graph } from '#types';

import { ForceGraph } from './ForceGraph';

const generator = random as any as ValueGenerator;

random.seed(1);

const DefaultStory = () => {
  const [space] = useSpaces();
  const model = useGraphModel(space?.db);

  const selection = useMemo(() => new SelectionModel({ mode: 'single' }), []);

  const handleInspect = useCallback<NonNullable<GraphProps<SpaceGraphNode, SpaceGraphEdge>['onInspect']>>(
    (node, event) => {
      // `null` node = pointerleave (no preview to open).
      if (!node) {
        return;
      }
      const obj = node.data?.data?.object;
      if (!obj) {
        return;
      }
      const uri = Obj.getURI(obj);
      if (!uri) {
        return;
      }
      const target = event.target as HTMLElement;
      target.dispatchEvent(
        new DxAnchorActivate({
          dxn: uri,
          label: Obj.getLabel(obj) ?? uri,
          trigger: target,
          kind: 'card',
        }),
      );
    },
    [],
  );

  if (!space || !model) {
    return <Loading data={{ space: !!space, model: !!model }} />;
  }

  return <ForceGraph model={model} selection={selection} onInspect={handleInspect} />;
};

const meta = {
  title: 'plugins/plugin-explorer/components/ForceGraph',
  component: ForceGraph,
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
} satisfies Meta<typeof ForceGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
