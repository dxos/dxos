//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as Layout from '@dxos/react-ui/Layout';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { GroupMenu, SortMenu, type SortValue, type ViewOption } from './ViewOptionsMenu.tsx';

type SortField = 'manual' | 'updated' | 'title';
type GroupField = 'none' | 'status' | 'owner';

const SORT_FIELDS: ViewOption<SortField>[] = [
  { id: 'manual', label: 'Manual', icon: 'ph--hand-grabbing--regular' },
  { id: 'updated', label: 'Updated', icon: 'ph--clock-clockwise--regular' },
  { id: 'title', label: 'Title', icon: 'ph--text-aa--regular' },
];

const GROUP_FIELDS: ViewOption<GroupField>[] = [
  { id: 'none', label: 'No grouping', icon: 'ph--list--regular' },
  { id: 'status', label: 'Status', icon: 'ph--circle-half--regular' },
  { id: 'owner', label: 'Owner', icon: 'ph--user--regular' },
];

const DIRECTION_LABELS = { asc: 'Ascending', desc: 'Descending' };

/** A list's sort and group controls; the story holds the values a host would persist. */
const DefaultStory = () => {
  const [sort, setSort] = useState<SortValue<SortField>>({ field: 'manual', direction: 'asc' });
  const [group, setGroup] = useState<GroupField>('none');
  return (
    <Layout.Flex column gap='sm'>
      <Layout.Flex gap='sm'>
        <SortMenu
          fields={SORT_FIELDS}
          value={sort}
          onChange={setSort}
          label='Sort'
          directionLabels={DIRECTION_LABELS}
          unsorted='manual'
          testId='story.sort'
        />
        <GroupMenu
          fields={GROUP_FIELDS}
          value={group}
          onChange={setGroup}
          label='Group'
          none='none'
          testId='story.group'
        />
      </Layout.Flex>
      <span data-testid='story.value'>{`${sort.field} ${sort.direction} / ${group}`}</span>
    </Layout.Flex>
  );
};

const meta = {
  title: 'ui/react-ui-menu/ViewOptionsMenu',
  render: DefaultStory,
  decorators: [withTheme(), withRegistry],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Picking a field names it on the trigger; the list's own order offers no direction. */
export const PickSortAndGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await userEvent.click(canvas.getByTestId('story.sort'));
    await userEvent.click(await body.findByTestId('story.sort.title'));
    await waitFor(() => expect(canvas.getByTestId('story.value').textContent).toBe('title asc / none'));
    await expect(canvas.getByTestId('story.sort').textContent).toContain('Title');

    await userEvent.click(canvas.getByTestId('story.group'));
    await userEvent.click(await body.findByTestId('story.group.owner'));
    await waitFor(() => expect(canvas.getByTestId('story.value').textContent).toBe('title asc / owner'));
  },
};
