//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { translations as clientTranslations } from '@dxos/plugin-client/translations';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { MembersContainer } from './MembersContainer.tsx';

const storyTranslations = [...translations, ...clientTranslations];

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return (
    <MembersContainer
      role='article'
      attendableId='story'
      space={space}
      createInvitationUrl={(invitationCode) => `https://composer.space/?spaceInvitationCode=${invitationCode}`}
    />
  );
};

const meta = {
  title: 'plugins/plugin-space/containers/MembersContainer',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contribute(AppCapabilities.Translations, storyTranslations)],
      plugins: [
        ...CorePlugins.make(),
        StorybookPlugin.make({}),
        // Without it the ContactPicker slot has no contribution and the section is hidden.
        ClientPlugin.make({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              // A pending invitation, so the Invitations list has a row beside the split button.
              space.share();
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: storyTranslations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The value, or a failure naming what is missing. */
const required = <T,>(value: T | null | undefined, name: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
};

/**
 * Members and invitations are Listbox rows: the arrow keys move the highlight, the ring spans the whole row, and a
 * pending invitation's x ends where the split button below it does.
 */
export const TestRows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = await canvas.findByTestId('space-members-list', undefined, { timeout: 10_000 });
    const invitations = await canvas.findByTestId('invitation-list', undefined, { timeout: 10_000 });
    const remove = await within(invitations).findByTestId('cancel-invitation', undefined, { timeout: 10_000 });

    for (const content of [members, invitations]) {
      content.focus();
      await userEvent.keyboard('{ArrowDown}');
      const row = required(content.querySelector<HTMLElement>('[role="option"][data-highlighted]'), 'highlighted row');
      const ring = getComputedStyle(row, '::before');
      await expect(ring.boxShadow).not.toBe('none');
      await expect(Number.parseFloat(ring.width)).toBeCloseTo(row.getBoundingClientRect().width, 0);
    }

    const split = await canvas.findByTestId('membersContainer.createInvitation.more');
    await expect(
      Math.abs(remove.getBoundingClientRect().right - split.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(1);
  },
};
