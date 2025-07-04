//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { type FC, useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type ClientRepeatedComponentProps, ClientRepeater } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Tree, type TreeComponentProps } from './Tree';
import { TreeType, Tree as TreeModel } from './types';

// TODO(burdon): Storybook for Graph/Tree/Plot (generics); incl. GraphModel.
// TODO(burdon): Type for all Explorer components (Space, Object, Query, etc.) incl.

faker.seed(1);

const Story: FC<ClientRepeatedComponentProps & { type?: TreeComponentProps<any>['variant'] }> = ({ type }) => {
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

export const Tidy = {
  args: {
    type: 'tidy',
  },
};

export const Radial = {
  args: {
    type: 'radial',
  },
};

export const Edge = {
  args: {
    type: 'edge',
  },
};

const meta: Meta = {
  title: 'plugins/plugin-explorer/Tree',
  component: Tree,
  render: () => <ClientRepeater component={Story} types={[TreeType]} createSpace />,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
