//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { translations as shellTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { MembersContainer } from './MembersContainer';

const meta: Meta = {
  title: 'plugins/plugin-space/MembersContainer',
  component: MembersContainer,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme, withLayout()],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof MembersContainer>;

export const Default: Story = {};
