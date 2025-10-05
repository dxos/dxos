//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type ClientRepeatedComponentProps, ClientRepeater } from '@dxos/react-client/testing';

import { Tree, type TreeComponentProps } from './Tree';
import { Tree as TreeModel, TreeType } from './types';

// TODO(burdon): Storybook for Graph/Tree/Plot (generics); incl. GraphModel.
// TODO(burdon): Type for all Explorer components (Space, Object, Query, etc.) incl.

faker.seed(1);

type ComponentProps = ClientRepeatedComponentProps & { type?: TreeComponentProps<any>['variant'] };

const Component = ({ type }: ComponentProps) => {
  const client = useClient();
  const space = client.spaces.default;
  const [object, setObject] = useState<TreeType>();
  useEffect(() => {
    setTimeout(() => {
      const tree = space.db.add(TreeModel.create());
      setObject(tree);
    });
  }, []);

  if (!object) {
    return null;
  }

  return <Tree space={space} selected={object?.id} variant={type} />;
};

const DefaultStory = () => {
  return <ClientRepeater component={Component} types={[TreeType]} createSpace />;
};

const meta = {
  title: 'plugins/plugin-explorer/Tree',
  component: Tree as any,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tidy: Story = {
  args: {
    type: 'tidy',
  },
};

export const Radial: Story = {
  args: {
    type: 'radial',
  },
};

export const Edge: Story = {
  args: {
    type: 'edge',
  },
};
