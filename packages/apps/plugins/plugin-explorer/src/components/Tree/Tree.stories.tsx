//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC, useEffect, useState } from 'react';

import { types, Tree as TreeType } from '@braneframe/types';
import { type GraphModel } from '@dxos/gem-spore';
import { useClient } from '@dxos/react-client';
import { ClientSpaceDecorator, FullscreenDecorator } from '@dxos/react-client/testing';

import { Tree, type TreeComponentProps } from './Tree';
import { SpaceGraphModel } from '../Graph';

// TODO(burdon): Storybook for Graph/Tree/Plot (generics); incl. GraphModel.
// TODO(burdon): Type for all Explorer components (Space, Object, Query, etc.) incl.
// TODO(burdon): Factor out to gem?

faker.seed(1);

const Story: FC<{ type?: TreeComponentProps<any>['type'] }> = ({ type } = {}) => {
  const client = useClient();
  const [model, setModel] = useState<GraphModel<any>>();
  useEffect(() => {
    setTimeout(() => {
      const space = client.spaces.default;

      const object = new TreeType({
        root: new TreeType.Item({
          items: [
            new TreeType.Item(),
            new TreeType.Item(),
            new TreeType.Item({
              items: [new TreeType.Item(), new TreeType.Item(), new TreeType.Item()],
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
                      items: [new TreeType.Item()],
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

      space.db.add(object);
      const model = new SpaceGraphModel().open(space);
      model.setSelected(object.root.id);

      setModel(model);
    });
  }, []);

  if (!model) {
    return null;
  }

  return <Tree type={type} model={model} />;
};

export default {
  component: Tree,
  render: Story,
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      schema: types,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Dendrogram = {
  args: {
    type: 'dendrogram',
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
