//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { AttentionGlyph, type AttentionGlyphProps } from './AttentionGlyph';

const Story = (props: AttentionGlyphProps) => {
  return (
    <ul className='flex gap-2 mbe-2'>
      <li>
        <AttentionGlyph presence='none' {...props} />
      </li>
      <li>
        <AttentionGlyph presence='one' {...props} />
      </li>
      <li>
        <AttentionGlyph presence='many' {...props} />
      </li>
    </ul>
  );
};

export default {
  title: 'ui/react-ui-attention/AttentionGlyph',
  component: AttentionGlyph,
  render: Story,
  decorators: [withTheme],
};

export const Default = {
  args: {},
};

export const Attention = {
  args: { attended: true },
};

export const Contains = {
  args: { containsAttended: true },
};

export const Syncing = {
  args: { syncing: true },
};
