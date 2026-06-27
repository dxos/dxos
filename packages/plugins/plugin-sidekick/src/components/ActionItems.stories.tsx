//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ActionItems, type ActionItem } from './ActionItems';

const initialItems: ActionItem[] = [
  { id: '1', text: 'Review the design doc', completed: false },
  { id: '2', text: 'Reply to the thread', completed: true },
  { id: '3', text: 'Ship the list migration', completed: false },
];

const meta = {
  title: 'plugins/plugin-sidekick/ActionItems',
  component: ActionItems,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof ActionItems>;

export default meta;

type Story = StoryObj<typeof ActionItems>;

/** Interactive: toggle the checkboxes to strike through completed items. */
export const Default: Story = {
  render: () => {
    const [items, setItems] = useState(initialItems);
    return (
      <ActionItems
        items={items}
        onToggle={(item) =>
          setItems((prev) =>
            prev.map((entry) => (entry.id === item.id ? { ...entry, completed: !entry.completed } : entry)),
          )
        }
      />
    );
  },
};

/** Empty state falls back to the "no action items" message. */
export const Empty: Story = {
  args: { items: [] },
};
