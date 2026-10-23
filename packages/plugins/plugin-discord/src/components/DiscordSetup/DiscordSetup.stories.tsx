//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Fieldset from '@dxos/react-ui/Fieldset';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordSetup } from './DiscordSetup.tsx';

type StoryArgs = {
  signedIn: boolean;
  error?: string;
  errorDetail?: string;
  denied?: { message: string; detail?: string };
  guilds: { id: string; name: string; installed?: boolean }[];
};

/** The setup panel's servers section in each of its states, as the container composes it. */
const DefaultStory = ({ signedIn, error, errorDetail, denied, guilds }: StoryArgs) => (
  <DiscordSetup.Root
    error={error}
    errorDetail={errorDetail}
    toolbar={<DiscordSetup.Toolbar signedIn={signedIn} onConnect={() => {}} />}
  >
    <Fieldset.Root>
      <Fieldset.Legend>Servers</Fieldset.Legend>
      {guilds.length === 0 ? (
        !signedIn ? (
          <DiscordSetup.SignIn onConnect={() => {}} />
        ) : (
          denied && <DiscordSetup.Empty message={denied.message} detail={denied.detail} />
        )
      ) : (
        <DiscordSetup.List ids={guilds.map(({ id }) => id)}>
          {guilds.map((guild) => (
            <DiscordSetup.Item
              key={guild.id}
              id={guild.id}
              icon='ph--users-three--regular'
              label={guild.name}
              detail={guild.installed ? 'Installed' : undefined}
            />
          ))}
        </DiscordSetup.List>
      )}
    </Fieldset.Root>
  </DiscordSetup.Root>
);

const meta = {
  title: 'plugins/plugin-discord/components/DiscordSetup',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Not signed in to Discord: a calm prompt with the sign-in action, and no error banner. */
export const SignedOut: Story = {
  args: { signedIn: false, guilds: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('discord-setup-sign-in')).toBeEnabled();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const SignedIn: Story = {
  args: {
    signedIn: true,
    guilds: [
      { id: '1', name: 'DXOS', installed: true },
      { id: '2', name: 'Composer users' },
    ],
  },
};

/** EDGE refused the caller (401/403): explained beside the servers rather than raised as a failure. */
export const NotAuthorised: Story = {
  args: {
    signedIn: true,
    guilds: [],
    denied: {
      message: 'You are not authorised to manage this Discord bot from this space.',
      detail: 'Not a member of the space.',
    },
  },
};

/** An unexpected failure: a readable message, with the raw reason beneath it. */
export const Failed: Story = {
  args: {
    signedIn: true,
    guilds: [],
    error: 'The Discord bot host on EDGE failed.',
    errorDetail: 'HTTP code 500: Internal Server Error.',
  },
};
