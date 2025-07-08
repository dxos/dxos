//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ProfileContainer } from './ProfileContainer';
import { translations } from '../translations';

const meta: Meta = {
  title: 'plugins/plugin-client/ProfileContainer',
  component: ProfileContainer,
  decorators: [withClientProvider({ createIdentity: true }), withTheme, withLayout()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ProfileContainer>;

export const Default: Story = {};
