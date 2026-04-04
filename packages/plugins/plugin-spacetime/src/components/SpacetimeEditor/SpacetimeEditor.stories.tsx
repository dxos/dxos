//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SpacetimeEditor, type SpacetimeEditorProps } from './SpacetimeEditor';

const DefaultStory = ({ showAxes, showFps }: SpacetimeEditorProps) => {
  return <SpacetimeEditor classNames='w-full h-full' showAxes={showAxes} showFps={showFps} />;
};

const meta = {
  title: 'plugins/plugin-spacetime/SpacetimeEditor',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    showAxes: { control: 'boolean' },
    showFps: { control: 'boolean' },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showAxes: true,
    showFps: true,
  },
};
