//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as shellTranslations } from '@dxos/shell/react';

import { ClientPlugin } from '#plugin';
import { createFakeContacts, initializeIdentity } from '#testing';
import { translations } from '#translations';

import { ContactPickerContainer } from './ContactPickerContainer.tsx';

type DefaultStoryProps = Pick<AppSurface.ContactPickerData, 'onAdd'>;

const DefaultStory = ({ onAdd }: DefaultStoryProps) => {
  const [space] = useSpaces();
  if (!space) {
    return null;
  }

  return <ContactPickerContainer space={space} onAdd={onAdd} />;
};

const meta = {
  title: 'plugins/plugin-client/containers/ContactPickerContainer',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client, { displayName: 'Me' });
              yield* createFakeContacts(client);
            }),
        }),
        ProcessManagerPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...shellTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onAdd: async () => ({ joinUrl: 'https://composer.space/?spaceKey=0123456789abcdef', failed: [] }),
  },
};
