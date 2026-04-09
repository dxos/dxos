//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins, StorybookPlugin } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { SearchContextProvider } from '#hooks';

import { translations } from '../../translations';
import { SearchDialog } from './SearchDialog';

faker.seed(0);

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return (
    <SearchContextProvider>
      <Dialog.Root defaultOpen>
        <Dialog.Overlay>
          <SearchDialog pivotId='storybook' space={space} />
        </Dialog.Overlay>
      </Dialog.Root>
    </SearchContextProvider>
  );
};

const meta = {
  title: 'plugins/plugin-search/containers/SearchDialog',
  component: SearchDialog,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              const factory = createObjectFactory(personalSpace.db, faker as any);
              yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 10 },
                  { type: Person.Person, count: 50 },
                ]),
              );
            }),
        }),
      ],
    }),
  ],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SearchDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Test: Story = {
  play: async () => {
    const body = within(document.body);

    // Wait for the dialog to render and the search input to appear.
    const searchInput = await body.findByRole('textbox', undefined, { timeout: 10_000 });
    await expect(searchInput).toBeInTheDocument();

    // Type a search term that should match generated Person/Organization names.
    await userEvent.type(searchInput, 'a');

    // Wait for search results to appear as options in the listbox.
    await waitFor(
      async () => {
        const options = body.queryAllByRole('option');
        await expect(options.length).toBeGreaterThan(0);
      },
      { timeout: 10_000 },
    );
  },
};
