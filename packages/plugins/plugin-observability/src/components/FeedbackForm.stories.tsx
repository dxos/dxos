//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

import { FeedbackForm } from './FeedbackForm';

const meta = {
  title: 'plugins/plugin-observability/FeedbackForm',
  component: FeedbackForm,
  decorators: [withTheme, withLayout({ container: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof FeedbackForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSave: (values) => {
      console.log(values);
    },
  },
};
