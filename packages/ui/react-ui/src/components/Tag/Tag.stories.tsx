//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { hues } from '@dxos/ui-types';
import { type ChromaticPalette, type MessageValence } from '@dxos/ui-types';

import { withLayout, withTheme } from '../../testing/index.ts';
import * as Tag from './Tag.tsx';

const palettes = ['neutral', 'success', 'info', 'warning', 'error', ...hues] as (ChromaticPalette | MessageValence)[];

const meta = {
  title: 'ui/react-ui-core/components/Tag',
  component: Tag.Root,
  render: () => (
    <div>
      {palettes.map((palette) => (
        <Tag.Root key={palette} hue={palette}>
          {palette}
        </Tag.Root>
      ))}
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'default' })],
} satisfies Meta<typeof Tag.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
