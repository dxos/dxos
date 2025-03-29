//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { create, makeRef } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { attentionSurface } from '@dxos/react-ui-theme';
import { type Meta, withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerRootProps } from './Outliner';
import { TreeNodeType } from '../../types';

faker.seed(100);

const DefaultStory = ({
  isTasklist,
  count = 1,
  data,
}: Pick<OutlinerRootProps, 'isTasklist'> & { count?: number; data?: 'words' | 'sentences' }) => {
  const [root] = useState<TreeNodeType>(
    create<TreeNodeType>({
      id: 'root',
      text: '',
      children: faker.helpers.multiple(
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
            create(TreeNodeType, {
              text,
              children: [],
            }),
          );
        },
        { count },
      ),
    }),
  );

  const handleCreate = (text = '') =>
    create(TreeNodeType, {
      text,
      children: [],
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

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-outliner/Outliner_old',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Empty: Story = {};

export const Default: Story = {
  args: {
    count: 3,
    data: 'sentences',
  },
};

export const Short: Story = {
  args: {
    count: 5,
    data: 'words',
  },
};

export const Checkbox: Story = {
  args: {
    count: 5,
    data: 'sentences',
    isTasklist: true,
  },
};
