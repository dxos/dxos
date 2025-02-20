//
// Copyright 2022 DXOS.org
//
import React from 'react';

import { hueTokenThemes } from '@dxos/react-ui-theme';
import '@dxos-theme';
import { type ChromaticPalette, type MessageValence } from '@dxos/react-ui-types';

import { Tag } from './Tag';
import { withTheme } from '../../testing';

const palettes = ['neutral', 'success', 'info', 'warning', 'error', ...Object.keys(hueTokenThemes)] as (
  | ChromaticPalette
  | MessageValence
)[];

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
