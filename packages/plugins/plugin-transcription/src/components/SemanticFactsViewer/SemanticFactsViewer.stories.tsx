//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DEMO_FACTS } from './facts';
import { SemanticFactsViewer, type SemanticFactsViewerProps } from './SemanticFactsViewer';

const DefaultStory = (props: SemanticFactsViewerProps) => <SemanticFactsViewer {...props} />;

const meta = {
  title: 'plugins/plugin-transcription/components/SemanticFactsViewer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
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
