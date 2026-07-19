//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SAMPLE_MESSAGES, StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { type SearchResult, buildSnippet } from '@dxos/react-ui-search';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { buildSearchQuery, toSearchResults } from '#hooks';
import { translations } from '#translations';

import { SearchResultList } from './SearchResultList';

random.seed(0);

/** Real term repeated across several `SAMPLE_MESSAGES` entries. */
const SEARCH_TERM = 'invoice';

/**
 * Enriches a raw `SearchResult` with a best-match snippet and the sender's name as metadata —
 * `toSearchResults` produces a generic snippet, but a `Message`'s full text and sender give a
 * better demo of the row layout.
 */
const enrichResult = (result: SearchResult, query: string): SearchResult => {
  const message = result.object && Obj.instanceOf(Message.Message, result.object) ? result.object : undefined;
  if (!message) {
    return result;
  }

  return {
    ...result,
    snippet: buildSnippet(Message.extractText(message), query),
    type: message.sender.name ?? 'Message',
  };
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [query, setQuery] = useState('');

  const objects = useQuery(space?.db, buildSearchQuery(query));
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const enrichedResults = useMemo(() => results.map((result) => enrichResult(result, query)), [results, query]);

  const handleSelect = useCallback((result: SearchResult) => {
    // Storybook demo only — selection has no further destination.
    console.log('select', result.id);
  }, []);

  if (!space) {
    return <Loading />;
  }

  return (
    <div className='flex flex-col gap-2 p-2 max-w-[32rem]'>
      <input
        type='text'
        placeholder='Search…'
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className='px-2 py-1 border border-separator rounded'
      />
      <SearchResultList results={enrichedResults} query={query} onSelect={handleSelect} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-search/components/SearchResultList',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [Message.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              for (const { from, subject, body } of SAMPLE_MESSAGES) {
                personalSpace.db.add(
                  Message.make({
                    sender: { email: from.email, name: from.name },
                    blocks: [{ _tag: 'text', text: body }],
                    properties: { subject, snippet: body.slice(0, 120) },
                  }),
                );
              }
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const input = await canvas.findByPlaceholderText('Search…', undefined, { timeout: 10_000 });
    await userEvent.type(input, SEARCH_TERM);

    // The seeded corpus repeats "invoice" across several finance messages, so this should surface
    // a proper multi-row match set — the end-to-end proof that FTS + ranking + rendering are wired.
    await waitFor(
      async () => {
        const rows = canvas.queryAllByRole('listitem');
        await expect(rows.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 15_000 },
    );

    const marks = canvasElement.querySelectorAll('mark');
    const matchingMark = Array.from(marks).find((mark) => mark.textContent?.toLowerCase().includes(SEARCH_TERM));
    await expect(matchingMark).toBeTruthy();

    // Each row's metadata cell shows the sender's name (populated by `enrichResult`).
    const rows = canvas.getAllByRole('listitem');
    const metadataCells = rows.map((row) => row.querySelector('span.text-description'));
    await expect(metadataCells.every((cell) => cell?.textContent)).toBe(true);
  },
};
