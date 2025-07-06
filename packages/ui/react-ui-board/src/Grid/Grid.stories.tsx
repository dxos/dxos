//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'ui/react-ui-board/Grid',
  component: Grid,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Grid>;

export const Default: Story = {};
