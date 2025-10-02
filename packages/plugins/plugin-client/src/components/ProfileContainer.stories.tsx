//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { ProfileContainer } from './ProfileContainer';

const meta = {
  title: 'plugins/plugin-client/ProfileContainer',
  component: ProfileContainer,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ProfileContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
