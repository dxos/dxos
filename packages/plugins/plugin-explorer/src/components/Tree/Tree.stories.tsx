//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { createTree } from './testing';
import { Tree, type TreeComponentProps } from './Tree';
import { TreeType } from './types';

random.seed(1);

type StoryArgs = { variant?: TreeComponentProps<any>['variant'] };

const DefaultStory = ({ variant }: StoryArgs) => {
  const [space] = useSpaces();
  const [tree] = useQuery(space?.db, Filter.type(TreeType));
  if (!space || !tree) {
    return <Loading data={{ space: !!space, tree: !!tree }} />;
  }

  return <Tree space={space} selected={tree.id} variant={variant} />;
};

const meta = {
  title: 'plugins/plugin-explorer/components/Tree',
  component: Tree as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [TreeType],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const tree = createTree([3, [2, 4], [1, 3]]).tree;
              personalSpace.db.add(tree);
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tidy: Story = {
  args: {
    variant: 'tidy',
  },
};

export const Radial: Story = {
  args: {
    variant: 'radial',
  },
};

export const Edge: Story = {
  args: {
    variant: 'edge',
  },
};
