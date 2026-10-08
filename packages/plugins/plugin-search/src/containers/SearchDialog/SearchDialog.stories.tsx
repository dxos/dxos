//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import * as Dialog from '@dxos/react-ui/Dialog';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { SearchContextProvider } from '#hooks';
import { translations } from '#translations';
import { SearchCapabilities } from '#types';

import { SearchDialog } from './SearchDialog.tsx';

random.seed(0);

/** Stands in for a plugin's action, answering text shaped like `owner/repo#123` without any I/O. */
const testQueryAction: SearchCapabilities.QueryAction = {
  id: 'storybook/query-action/import',
  match: (text) => {
    const reference = /^[\w.-]+\/[\w.-]+#\d+$/.exec(text)?.[0];
    if (!reference) {
      return undefined;
    }
    return {
      label: [
        'storybook-import.label',
        { ns: 'storybook', defaultValue: 'Import {{reference}} from GitHub', reference },
      ],
      icon: 'ph--git-pull-request--regular',
    };
  },
  run: () => Effect.succeed(undefined),
};

const DefaultStory = () => {
  const [space] = useSpaces();
  if (!space) {
    return <Loading />;
  }

  return (
    <SearchContextProvider>
      <Dialog.Root defaultOpen>
        <SearchDialog role='article' space={space} attendableId={space.id} pivotId='storybook' />
      </Dialog.Root>
    </SearchContextProvider>
  );
};

const meta = {
  title: 'plugins/plugin-search/containers/SearchDialog',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        Capability.contribute(SearchCapabilities.QueryAction, [testQueryAction]),
      ],
      plugins: [
        ...CorePlugins.make(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);

              const factory = createObjectFactory(defaultSpace.db, random as any);
              yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 10 },
                  { type: Person.Person, count: 50 },
                ]),
              );
              // The story searches the full-text index, which lags the indexing pass until a flush drains it.
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true, secondaryIndexes: true }));
            }),
        }),
      ],
    }),
  ],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Test: Story = {
  play: async () => {
    const body = within(document.body);

    // Wait for the dialog to render and the search input to appear.
    const searchInput = await body.findByRole('textbox', undefined, { timeout: 10_000 });
    await expect(searchInput).toBeInTheDocument();

    // Type a 3+ char term (FTS trigram minimum) likely present across 60 seeded objects.
    await userEvent.type(searchInput, 'the');

    // Wait for search results to appear as options in the listbox — this is the
    // end-to-end proof that the FTS5 index is wired and populated.
    await waitFor(
      async () => {
        const options = body.queryAllByRole('option');
        await expect(options.length).toBeGreaterThan(0);
      },
      { timeout: 15_000 },
    );
  },
};

export const QueryAction: Story = {
  play: async () => {
    const body = within(document.body);
    const searchInput = await body.findByRole('textbox', undefined, { timeout: 10_000 });

    // The row is built from the text alone, so it is offered before any search result could be.
    await userEvent.type(searchInput, 'dxos/dxos#1234');
    await expect(await body.findByRole('option', { name: 'Import dxos/dxos#1234 from GitHub' })).toBeInTheDocument();
  },
};
