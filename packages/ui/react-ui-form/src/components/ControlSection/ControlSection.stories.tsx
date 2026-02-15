//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme() } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ControlPage, ControlSection } from './ControlSection';

const meta = {
  title: 'ui/react-ui-form/ControlSection',
  component: ControlSection,
  render: (args) => (
    <ControlPage>
      <ControlSection {...args} />
    </ControlPage>
  ),
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ControlSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Control Section',
    description: 'This is a control section',
  },
};
