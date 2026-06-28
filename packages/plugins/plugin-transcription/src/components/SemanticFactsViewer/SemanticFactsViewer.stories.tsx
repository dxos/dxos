//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SemanticFactsViewer, type SemanticFactsViewerProps } from './SemanticFactsViewer';
import { DEMO_FACTS } from './facts';

const DefaultStory = (props: SemanticFactsViewerProps) => (
  <div className='is-[40rem] max-is-full'>
    <SemanticFactsViewer {...props} />
  </div>
);

const meta = {
  title: 'plugins/plugin-transcription/components/SemanticFactsViewer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { facts: DEMO_FACTS },
};

export const Empty: Story = {
  args: { facts: [] },
};
