//
// Copyright 2022 DXOS.org
//
import React from 'react';

import { hues } from '@dxos/react-ui-theme';
import '@dxos-theme';
import { type ChromaticPalette, type MessageValence } from '@dxos/react-ui-types';

import { withTheme } from '../../testing';

import { Tag } from './Tag';

const palettes = ['neutral', 'success', 'info', 'warning', 'error', ...hues] as (ChromaticPalette | MessageValence)[];

export default {
  title: 'ui/react-ui-core/Tag',
  component: Tag,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
} as const;

export const Default = {
  render: () => (
    <div role='grid' className='grid grid-cols-5 gap-2 max-is-screen-md'>
      {palettes.map((palette) => (
        <Tag key={palette} palette={palette}>
          {palette}
        </Tag>
      ))}
    </div>
  ),
};
