//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Options } from './Options';

const meta = {
  title: 'apps/composer-crx/Options',
  component: Options,
  decorators: [withTheme(), withLayout({ layout: 'column', scroll: true })],
  parameters: { translations },
} satisfies Meta<typeof Options>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
