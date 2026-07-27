//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Terra } from '#types';

import { TerraArticle } from './TerraArticle';

type StoryArgs = {
  seed?: string;
};

const DefaultStory = ({ seed }: StoryArgs) => {
  const terra = useMemo(
    () =>
      Terra.make({
        config: { seed: seed ?? 'terra-1', resolution: 256 },
      }),
    [seed],
  );

  return <TerraArticle subject={terra} attendableId='story' role='article' />;
};

const meta = {
  title: 'plugins/plugin-terra/containers/TerraArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
