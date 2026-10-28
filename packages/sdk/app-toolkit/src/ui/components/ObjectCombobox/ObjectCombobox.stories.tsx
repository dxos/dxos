//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Collection } from '@dxos/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import * as ObjectCombobox from './ObjectCombobox.tsx';

// Enough named objects that the popup scrolls, created out of order so the story shows the sort.
const NAMES = Array.from({ length: 24 }, (_, index) => `Collection ${String.fromCharCode(90 - index)}`);

const DefaultStory = () => {
  const { space } = useClientStory();
  const [value, setValue] = useState<string>();
  return (
    <div className='w-80 p-4'>
      <ObjectCombobox.Root db={space?.db} value={value} placeholder='Pick an object' onValueChange={setValue} />
    </div>
  );
};

const meta = {
  title: 'sdk/app-toolkit/components/ObjectCombobox',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withClientProvider({
      types: [Collection.Collection],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: ({ space }) => {
        for (const name of NAMES) {
          space.db.add(Collection.make({ name }));
        }
      },
    }),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The listed objects sorted by label, each with its icon, under a search field the options never scroll beneath. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    // 1. The popup lists every named object, sorted by label, each with its type icon.
    const trigger = await within(canvasElement).findByRole('button', { name: /Pick an object/ }, { timeout: 10_000 });
    await userEvent.click(trigger);
    const popup = await body.findByRole('dialog');
    await waitFor(() => expect(within(popup).getAllByRole('option')).toHaveLength(NAMES.length), { timeout: 10_000 });
    const labels = within(popup)
      .getAllByRole('option')
      .map((option) => option.textContent);
    await expect(labels).toEqual([...NAMES].sort());
    await expect(within(popup).getAllByRole('option')[0].querySelector('[data-scope="icon"]')).not.toBeNull();

    // 2. The search field sits above the scrolling list, not inside it.
    const search = within(popup).getByRole('combobox');
    const list = within(popup).getByRole('listbox');
    const viewport = list.closest('[data-part="viewport"]');
    if (!viewport) {
      throw new Error('The list has no scroll viewport.');
    }
    await expect(viewport.contains(search)).toBe(false);
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

    // 3. Typing narrows the list; Enter picks the first match. zag focuses the field a frame after the popup opens,
    //    and keys typed before that go to the trigger.
    await waitFor(() => expect(search).toHaveFocus());
    await userEvent.keyboard('Collection D{Enter}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await expect(trigger).toHaveTextContent('Collection D');
  },
};
