//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { Scene } from '#types';

import { SceneCard } from './SceneCard.tsx';

const CardStory = () => {
  const scene = useMemo(() => Scene.make({ name: 'Test Scene' }), []);
  return (
    <CardContainer role='popover' icon={pluginMeta.profile.icon?.key}>
      <SceneCard role='card--content' subject={scene} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-spacetime/containers/SceneCard',
  render: () => <CardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {};
