//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect, useState } from 'react';

import { TreeItemType, TreeType } from '@braneframe/types';
import { range } from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';

import { Tree, type TreeComponentProps } from './Tree';

// TODO(burdon): Storybook for Graph/Tree/Plot (generics); incl. GraphModel.
// TODO(burdon): Type for all Explorer components (Space, Object, Query, etc.) incl.
// TODO(burdon): Factor out to gem?

faker.seed(1);

const makeTreeItems = <T extends number>(count: T, items: TreeItemType[] = []) => {
  return range(() => create(TreeItemType, { content: '', items }), count);
};

const Story: FC<{ type?: TreeComponentProps<any>['variant'] }> = ({ type } = {}) => {
  const client = useClient();
  const space = client.spaces.default;
  const [object, setObject] = useState<TreeType>();
  useEffect(() => {
    setTimeout(() => {
      const tree = create(TreeType, {
        root: makeTreeItems(1, [
          ...makeTreeItems(7),
          ...makeTreeItems(1, [
            ...makeTreeItems(1),
            ...makeTreeItems(1, [
              ...makeTreeItems(3),
              ...makeTreeItems(1, makeTreeItems(2)),
              ...makeTreeItems(2),
              ...makeTreeItems(1, makeTreeItems(2)),
              ...makeTreeItems(2),
            ]),
            ...makeTreeItems(1),
          ]),
          ...makeTreeItems(2),
          ...makeTreeItems(1, [
            ...makeTreeItems(1),
            ...makeTreeItems(1, [...makeTreeItems(2), ...makeTreeItems(1, makeTreeItems(2))]),
            ...makeTreeItems(1),
          ]),
          ...makeTreeItems(2),
        ])[0],
      });

      space.db.add(tree);
      setObject(tree);
    });
  }, []);

  if (!object) {
    return null;
  }

  return <Tree space={space} selected={object?.id} variant={type} />;
};

export default {
  title: 'plugin-explorer/Tree',
  component: Tree,
  render: () => <ClientRepeater component={Story} createSpace />,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
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
