//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Filter, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { generateFeed } from '../testing';
import { translations } from '../translations';
import { Magazine, Subscription } from '../types';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [magazine] = useQuery(space?.db, Filter.type(Magazine.Magazine));
  if (!magazine) {
    return <Loading />;
  }

  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={magazine} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-feed/stories/MagazineProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Magazine.Magazine, Subscription.Feed, Subscription.Post, Tag.Tag, Text.Text],
      onCreateSpace: async ({ space }) => {
        // Pre-seed a couple of feeds so the Feeds combobox has options to pick from,
        // exercising both "select existing" and "create new" flows.
        space.db.add(
          generateFeed({
            name: 'Apple Newsroom',
            url: 'https://www.apple.com/newsroom/rss-feed.rss',
          }),
        );
        space.db.add(
          generateFeed({
            name: 'Vercel Changelog',
            url: 'https://vercel.com/changelog/feed',
          }),
        );
        const magazine = space.db.add(
          Magazine.make({
            name: 'Distributed Systems Reading',
          }),
        );
        // Expose the magazine + space on `window` so the play function can
        // assert directly against the underlying ECHO state (e.g. that
        // `magazine.feeds` actually grew after the create-feed flow).
        (globalThis as any).__feedTestMagazine = magazine;
        (globalThis as any).__feedTestSpace = space;
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default Magazine ObjectProperties — exercises the auto-generated form,
 * including the markdown editor for `instructions` and the Feeds picker.
 *
 * Manual flow:
 *  1. Open the Feeds combobox.
 *  2. Either pick an existing feed, or fill out the inline create form to add
 *     a new one.
 *  3. The new feed appears in the magazine's feeds array.
 */
export const Default: Story = {};

/**
 * Drives the inline create-feed flow end-to-end and verifies the picker
 * dismisses after a successful Save.
 *
 * Steps:
 *  1. Click the Feeds "Add" (+) button to materialise an empty array slot.
 *  2. Click the slot's combobox trigger to open the picker.
 *  3. Type a query that doesn't match any existing feed.
 *  4. Click the "Create new" item, switching the picker to the inline form.
 *  5. Fill `name` and `url`, then click Save.
 *
 * Final assertion: the create form is gone. (`Subscription.Feed`'s required
 * backing-feed ref is supplied by `FactoryAnnotation` → `makeFeed`, hidden
 * fields are stripped by `omitHiddenFormFields`, and `RefField` writes the
 * new ref into the slot via `onValueChange` before dismissing the popover.)
 */
export const CreateFeed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // 1. Click the Feeds "Add" button. ECHO/space setup is async via
    //    `withClientProvider.onCreateSpace`, so wait long enough for the
    //    magazine to be queried and the form to render.
    const addButtons = await canvas.findAllByRole('button', { name: /add/i }, { timeout: 10_000 });
    // Two array fields render an "Add item" button (Tags + Feeds). Pick the
    // Feeds one — it's the second.
    const feedsAddButton = addButtons[addButtons.length - 1];
    await userEvent.click(feedsAddButton);
    // Let React commit the new slot row.
    await new Promise((resolve) => setTimeout(resolve, 250));

    // 2. Open the slot's combobox. The new empty slot renders a `combobox`-role
    //    trigger; just grab the only one in the canvas.
    const comboboxes = await canvas.findAllByRole('combobox', undefined, { timeout: 10_000 });
    const slotTrigger = comboboxes[0];
    await expect(slotTrigger).toBeDefined();
    await userEvent.click(slotTrigger);

    // 3. The popover listbox is rendered into a portal on document.body.
    const listbox = await body.findByRole('listbox', undefined, { timeout: 5000 });
    await expect(listbox).toBeVisible();
    const search = await body.findByPlaceholderText(/search/i);
    await userEvent.type(search, 'My Brand New Blog');

    // 4. Click the "Create new" item. ObjectPicker switches to its inline form.
    const createOption = await body.findByRole('option', { name: /create/i }, { timeout: 3000 });
    await userEvent.click(createOption);
    const form = await body.findByTestId('create-referenced-object-form', undefined, { timeout: 5000 });
    await expect(form).toBeVisible();

    // 5. Fill the visible form fields and click Save. Anchor the labels to
    //    avoid matching `iconUrl` when looking for `url`.
    const nameInput = await within(form).findByLabelText(/^name$/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'My Brand New Blog');
    const urlInput = await within(form).findByLabelText(/^url$/i);
    await userEvent.type(urlInput, 'https://example.com/feed');
    const saveButton = await within(form).findByTestId('save-button');
    await userEvent.click(saveButton);

    // Allow any async state updates to flush.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // After Save: the create form is dismissed.
    await expect(body.queryByTestId('create-referenced-object-form')).not.toBeInTheDocument();

    // First diagnose: the new Feed must exist in space.db. If this passes
    // but the magazine.feeds assertion below fails, the bug is in the
    // RefField → form → ObjectProperties.handleChange wiring (the user-
    // reported "feed created but not linked" symptom).
    const space = (globalThis as any).__feedTestSpace;
    const allFeeds = await space.db.query(Filter.type(Subscription.Feed)).run();
    const newFeed = allFeeds.find((feed: Subscription.Feed) => feed.name === 'My Brand New Blog');
    await expect(newFeed, 'new Feed with name "My Brand New Blog" should be in the database').toBeDefined();

    // Second: the magazine.feeds array must contain a Ref to that new Feed.
    const magazine = (globalThis as any).__feedTestMagazine as Magazine.Magazine | undefined;
    await expect(magazine).toBeDefined();
    await expect(magazine!.feeds.length, 'magazine.feeds should grow by 1 after Create + Save').toBe(1);

    // Third: that Ref must point to the new Feed (not some other pre-seeded
    // one — guards against an off-by-one bug in the create flow that would
    // overwrite the slot with a stale ref).
    const linkedId = magazine!.feeds[0]?.dxn.toString().split(':').pop();
    const newId = (newFeed as any).id;
    await expect(linkedId, 'magazine.feeds[0] should reference the newly-created Feed').toBe(newId);
  },
};
