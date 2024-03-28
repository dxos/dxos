//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect, useState } from 'react';

import { types, Tree as TreeType } from '@braneframe/types/proto';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { ClientRepeater, FullscreenDecorator } from '@dxos/react-client/testing';

import { Tree, type TreeComponentProps } from './Tree';

// TODO(burdon): Storybook for Graph/Tree/Plot (generics); incl. GraphModel.
// TODO(burdon): Type for all Explorer components (Space, Object, Query, etc.) incl.
// TODO(burdon): Factor out to gem?

faker.seed(1);

const Story: FC<{ type?: TreeComponentProps<any>['variant'] }> = ({ type } = {}) => {
  const client = useClient();
  const space = client.spaces.default;
  const [object, setObject] = useState<TreeType>();
  useEffect(() => {
    setTimeout(() => {
      const tree = new TreeType({
        root: new TreeType.Item({
          items: [
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item({
              items: [
                new TreeType.Item(),
                new TreeType.Item({
                  items: [
                    new TreeType.Item(),
                    new TreeType.Item(),
                    new TreeType.Item(),
                    new TreeType.Item({
                      items: [new TreeType.Item(), new TreeType.Item()],
                    }),
                    new TreeType.Item(),
                    new TreeType.Item(),
                    new TreeType.Item({
                      items: [new TreeType.Item(), new TreeType.Item()],
                    }),
                    new TreeType.Item(),
                    new TreeType.Item(),
                  ],
                }),
                new TreeType.Item(),
              ],
            }),
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item({
              items: [
                new TreeType.Item(),
                new TreeType.Item({
                  items: [
                    new TreeType.Item(),
                    new TreeType.Item(),
                    new TreeType.Item({
                      items: [new TreeType.Item(), new TreeType.Item()],
                    }),
                  ],
                }),
                new TreeType.Item(),
              ],
            }),
            new TreeType.Item(),
            new TreeType.Item(),
          ],
        }),
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
  render: () => <ClientRepeater component={Story} types={types} createSpace />,
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
