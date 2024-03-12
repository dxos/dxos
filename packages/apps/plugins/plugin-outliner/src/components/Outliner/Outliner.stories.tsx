//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal, type RevertDeepSignal } from 'deepsignal/react';
import React, { useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { DensityProvider } from '@dxos/react-ui';
import { attentionSurface } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Outliner, type OutlinerRootProps } from './Outliner';
import { type Item } from './types';

faker.seed(100);

const Story = ({
  isTasklist,
  count = 1,
  data,
}: Pick<OutlinerRootProps, 'isTasklist'> & { count?: number; data?: 'words' | 'sentences' }) => {
  const [root] = useState<Item>(
    deepSignal<Item>({
      id: 'root',
      text: new TextObject(),
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

          return {
            id: PublicKey.random().toHex(),
            text: new TextObject(text),
          };
        },
        { count },
      ),
    }) as RevertDeepSignal<Item>,
  );

  const handleCreate = (text = '') => ({
    id: PublicKey.random().toHex(),
    text: new TextObject(text),
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
