//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as shellTranslations } from '@dxos/shell/react';
import { render } from '@dxos/storybook-utils';

import { translations } from '../../translations';

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
    withTheme, // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: [IntentPlugin()] }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
