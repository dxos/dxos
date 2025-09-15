//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { translations as shellTranslations } from '@dxos/shell/react';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { MembersContainer } from './MembersContainer';

const DefaultStory = () => {
  const space = useSpace();
  if (!space) {
    return null;
  }

  return (
    <MembersContainer
      space={space}
      createInvitationUrl={(invitationCode) => `https://dxos.org/invite/${invitationCode}`}
    />
  );
};

const meta = {
  title: 'plugins/plugin-space/MembersContainer',
  component: MembersContainer as any,
  render: render(DefaultStory),
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
    }),
    withTheme,
    withLayout(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
