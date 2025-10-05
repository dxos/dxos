//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';
import { withClientProvider } from '@dxos/react-client/testing';

import { translations } from '../translations';

import { ProfileContainer } from './ProfileContainer';

const meta = {
  title: 'plugins/plugin-client/ProfileContainer',
  component: ProfileContainer,
  decorators: [withTheme, withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ProfileContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
