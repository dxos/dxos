//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { AttentionGlyph } from './AttentionGlyph';

type StorybookAttentionGlyphProps = {
  current?: boolean;
  attention?: boolean;
};

const StorybookAttentionGlyph = ({ current, attention }: StorybookAttentionGlyphProps) => {
  const itemAttrs = {
    ...(current && { 'aria-current': 'page' as const }),
    ...(attention && { 'data-attention': 'true' }),
  };
  return (
    <ul className='flex gap-2 mbe-2'>
      <li {...itemAttrs}>
        <AttentionGlyph presence='none' />
      </li>
      <li {...itemAttrs}>
        <AttentionGlyph presence='one' />
      </li>
      <li {...itemAttrs}>
        <AttentionGlyph presence='many' />
      </li>
    </ul>
  );
};

export default {
  title: 'react-ui-deck/AttentionGlyph',
  component: StorybookAttentionGlyph,
  decorators: [withTheme],
};

export const Default = {
  args: {},
};
export const Current = {
  args: { current: true },
};
export const Attention = {
  args: { current: true, attention: true },
};
