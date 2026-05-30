//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { sampleResult } from '../../testing';
import { translations } from '../../translations';
import { ResultCard } from './ResultCard';

const meta: Meta<typeof ResultCard> = {
  title: 'plugins/plugin-product-search/ResultCard',
  component: ResultCard,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[20rem]' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    subject: sampleResult,
  },
};

export const Current: Story = {
  args: {
    subject: sampleResult,
    current: true,
  },
};
