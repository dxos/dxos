//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { create, makeRef } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { attentionSurface } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerRootProps } from './Outliner';
import { TreeItemType } from '../../types';

faker.seed(100);

const DefaultStory = ({
  isTasklist,
  count = 1,
  data,
}: Pick<OutlinerRootProps, 'isTasklist'> & { count?: number; data?: 'words' | 'sentences' }) => {
  const [root] = useState<TreeItemType>(
    create<TreeItemType>({
      id: 'root',
      content: '',
      items: faker.helpers.multiple(
        () => {
          let text = '';
          switch (data) {
            case 'words': {
              text = faker.lorem.words();
              break;
            }
            case 'sentences': {
              text = faker.lorem
                .sentences({ min: 1, max: 3 })
                .split(/\. \s*/)
                .join('.\n');
              break;
            }
          }

          return makeRef(
            create(TreeItemType, {
              content: text,
              items: [],
            }),
          );
        },
        { count },
      ),
    }),
  );

  const handleCreate = (text = '') =>
    create(TreeItemType, {
      content: text,
      items: [],
    });

  const handleDelete = () => {};

  return (
    <Outliner.Root
      className={attentionSurface}
      root={root}
      placeholder='Enter text...'
      onCreate={handleCreate}
      onDelete={handleDelete}
      isTasklist={isTasklist}
    />
  );
};

export const Empty = {};

export const Default = {
  args: {
    count: 3,
    data: 'sentences',
  },
};

export const Short = {
  args: {
    count: 5,
    data: 'words',
  },
};

export const Checkbox = {
  args: {
    count: 5,
    data: 'sentences',
    isTasklist: true,
  },
};

const meta = {
  title: 'plugins/plugin-outliner/Outliner',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
