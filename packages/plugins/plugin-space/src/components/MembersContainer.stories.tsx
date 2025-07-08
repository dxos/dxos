//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { osTranslations } from '@dxos/shell/react';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { MembersContainer } from './MembersContainer';
import { translations } from '../translations';

const meta: Meta = {
  title: 'plugins/plugin-space/MembersContainer',
  component: MembersContainer,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme, withLayout()],
  parameters: {
    layout: 'fullscreen',
    translations: [translations, osTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof MembersContainer>;

export const Default: Story = {};
