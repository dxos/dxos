//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { hues } from '@dxos/react-ui-theme';
import { type ChromaticPalette, type MessageValence } from '@dxos/react-ui-types';


import { Tag } from './Tag';

const palettes = ['neutral', 'success', 'info', 'warning', 'error', ...hues] as (ChromaticPalette | MessageValence)[];

const meta = {
  title: 'ui/react-ui-core/Tag',
  component: Tag,
    parameters: { chromatic: { disableSnapshot: false } },
} as const;

export const Default: Story = {
  render: () => (
    <div role='grid' className='grid grid-cols-5 gap-2 max-is-screen-md'>
      {palettes.map((palette) => (
        <Tag key={palette} palette={palette}>
          {palette}
        </Tag>
      ))}
    </div>
  ),
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;
