//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { TextV0Type, TreeItemType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { DensityProvider } from '@dxos/react-ui';
import { attentionSurface } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerRootProps } from './Outliner';

faker.seed(100);

const Story = ({
  isTasklist,
  count = 1,
  data,
}: Pick<OutlinerRootProps, 'isTasklist'> & { count?: number; data?: 'words' | 'sentences' }) => {
  const [root] = useState<TreeItemType>(
    create<TreeItemType>({
      id: 'root',
      text: create(TextV0Type, { content: '' }),
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

          return create(TreeItemType, {
            text: create(TextV0Type, { content: text }),
            items: [],
          });
        },
        { count },
      ),
    }),
  );

  const handleCreate = (text = '') =>
    create(TreeItemType, {
      text: create(TextV0Type, { content: text }),
      items: [],
    });

  const handleDelete = () => {};

  return (
    <DensityProvider density='fine'>
      <Outliner.Root
        className={attentionSurface}
        root={root}
        placeholder='Enter text...'
        onCreate={handleCreate}
        onDelete={handleDelete}
        isTasklist={isTasklist}
      />
    </DensityProvider>
  );
};

export default {
  title: 'plugin-outliner/Outliner',
  component: Outliner,
  decorators: [withTheme],
  render: Story,
  parameters: {
    layout: 'fullscreen',
  },
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
